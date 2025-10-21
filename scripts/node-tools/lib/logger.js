/**
 * Logger utility for consistent colored output
 * @module logger
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

const emojis = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  rocket: '🚀',
  magnify: '🔍',
  chart: '📊',
  folder: '📁',
  file: '📄',
  check: '✓',
  cross: '✗',
  arrow: '→',
  bullet: '•',
  star: '⭐',
  fire: '🔥',
  sparkles: '✨',
  target: '🎯',
  trophy: '🏆',
  gear: '⚙️',
  package: '📦',
  book: '📚',
  wrench: '🔧',
  hammer: '🔨',
  hourglass: '⏳',
  clock: '🕐',
  calendar: '📅'
};

class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.silent = options.silent || false;
  }

  colorize(text, color) {
    return `${colors[color] || ''}${text}${colors.reset}`;
  }

  log(message, options = {}) {
    if (this.silent) return;
    
    const prefix = options.emoji ? `${options.emoji} ` : '';
    const coloredMsg = options.color ? this.colorize(message, options.color) : message;
    console.log(`${prefix}${coloredMsg}`);
  }

  success(message) {
    this.log(message, { emoji: emojis.success, color: 'green' });
  }

  error(message) {
    this.log(message, { emoji: emojis.error, color: 'red' });
  }

  warning(message) {
    this.log(message, { emoji: emojis.warning, color: 'yellow' });
  }

  info(message) {
    this.log(message, { emoji: emojis.info, color: 'cyan' });
  }

  debug(message) {
    if (this.verbose) {
      this.log(message, { emoji: emojis.magnify, color: 'gray' });
    }
  }

  title(message) {
    const line = '═'.repeat(70);
    console.log(`\n${this.colorize('╔' + line + '╗', 'cyan')}`);
    console.log(`${this.colorize('║', 'cyan')} ${this.colorize(message.padEnd(70), 'bright')}${this.colorize('║', 'cyan')}`);
    console.log(`${this.colorize('╚' + line + '╝', 'cyan')}\n`);
  }

  section(message) {
    const line = '─'.repeat(message.length + 4);
    console.log(`\n${this.colorize(line, 'cyan')}`);
    console.log(`${this.colorize(`  ${message}`, 'cyan')}`);
    console.log(`${this.colorize(line, 'cyan')}\n`);
  }

  table(headers, rows) {
    const widths = headers.map((h, i) => 
      Math.max(h.length, ...rows.map(r => String(r[i]).length))
    );

    const formatRow = (data) => 
      data.map((cell, i) => String(cell).padEnd(widths[i])).join(' | ');

    console.log(formatRow(headers));
    console.log(widths.map(w => '─'.repeat(w)).join('─┼─'));
    rows.forEach(row => console.log(formatRow(row)));
  }

  progress(current, total, label = '') {
    if (this.silent) return;
    
    const percentage = Math.round((current / total) * 100);
    const barLength = 40;
    const filled = Math.round((barLength * current) / total);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    
    process.stdout.write(`\r${label} [${bar}] ${percentage}% (${current}/${total})`);
    
    if (current === total) {
      console.log(''); // New line when complete
    }
  }

  summary(title, items) {
    this.section(title);
    items.forEach(item => {
      const icon = item.status === 'success' ? emojis.check : 
                   item.status === 'error' ? emojis.cross :
                   emojis.bullet;
      const color = item.status === 'success' ? 'green' :
                    item.status === 'error' ? 'red' : 'white';
      
      this.log(`  ${icon} ${item.label}: ${item.value}`, { color });
    });
    console.log('');
  }

  box(messages, options = {}) {
    const width = options.width || 70;
    const padding = options.padding || 2;
    const lines = Array.isArray(messages) ? messages : [messages];
    
    console.log(`\n${'═'.repeat(width)}`);
    lines.forEach(line => {
      const padded = line.padEnd(width - padding * 2);
      console.log(`${' '.repeat(padding)}${padded}${' '.repeat(padding)}`);
    });
    console.log(`${'═'.repeat(width)}\n`);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances
export { Logger, colors, emojis };

export default logger;
