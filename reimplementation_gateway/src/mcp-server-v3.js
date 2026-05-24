#!/usr/bin/env node
// Core Reimplementation MCP Server v3 talks to the Electron app over TCP IPC

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IPC_PORT = process.env.AGENT_HUB_PORT || 19222;

class IPCClient {
    constructor(port = IPC_PORT) {
        this.port = port;
        this.socket = null;
        this.connected = false;
        this.responseBuffer = '';
        this.pendingRequests = new Map();
        this.requestId = 0;
    }

    async connect() {
        if (this.connected) return true;
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection({ port: this.port, host: '127.0.0.1' }, () => {
                console.error('[MCP] Connected to Agent Hub');
                this.connected = true;
                resolve(true);
            });
            this.socket.on('data', (data) => {
                this.responseBuffer += data.toString();
                this.processBuffer();
            });
            this.socket.on('error', (err) => {
                console.error('[MCP] IPC Error:', err.message);
                this.connected = false;
                reject(err);
            });
            this.socket.on('close', () => {
                console.error('[MCP] Disconnected from Agent Hub');
                this.connected = false;
            });
            setTimeout(() => {
                if (!this.connected) reject(new Error('Connection timeout - Is Agent Hub running?'));
            }, 5000);
        });
    }

    processBuffer() {
        const lines = this.responseBuffer.split('\n');
        this.responseBuffer = lines.pop() || '';
        for (const line of lines) {
            if (line.trim()) {
                try {
                    const response = JSON.parse(line);
                    if (response.requestId && this.pendingRequests.has(response.requestId)) {
                        const { resolve } = this.pendingRequests.get(response.requestId);
                        this.pendingRequests.delete(response.requestId);
                        resolve(response);
                    }
                } catch (e) {}
            }
        }
    }

    async send(action, provider = null, data = {}) {
        if (!this.connected) await this.connect();
        const requestId = ++this.requestId;
        const request = { requestId, action, provider, data };
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });
            this.socket.write(JSON.stringify(request) + '\n');
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 120000);
        });
    }
}

const ipcClient = new IPCClient();

class AIProvider {
    constructor(name, ipcClient) {
        this.name = name;
        this.ipc = ipcClient;
    }
    async chat(message) {
        return (await this.ipc.send('chat', this.name, { message })).response;
    }
}

const perplexity = new AIProvider('perplexity', ipcClient);

const server = new McpServer({
    name: 'agent-hub',
    version: '3.0.0',
    description: 'Agent Hub MCP Server v3'
});

server.tool(
    'deep_search',
    { query: z.string().describe('Search query') },
    async ({ query }) => {
        try {
            const response = await perplexity.chat(query);
            return { content: [{ type: 'text', text: response }] };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Server running on stdio');
}

main().catch(console.error);
