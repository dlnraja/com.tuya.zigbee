#!/usr/bin/env node

/**
 * 🔔 NOTIFICATION SYSTEM
 * 📅 Date: 2025-08-04
 * 🎯 Mode: YOLO NOTIFICATIONS
 * 📦 Système de notifications pour tuya-light
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.subscribers = new Map();
    }
    
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    }
    
    unsubscribe(event, callback) {
        if (this.subscribers.has(event)) {
            const callbacks = this.subscribers.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    notify(event, data) {
        const notification = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            event,
            data
        };
        
        this.notifications.push(notification);
        
        // Garder seulement les 1000 dernières notifications
        if (this.notifications.length > 1000) {
            this.notifications = this.notifications.slice(-1000);
        }
        
        // Notifier les abonnés
        if (this.subscribers.has(event)) {
            this.subscribers.get(event).forEach(callback => {
                try {
                    callback(notification);
                } catch (error) {
                    console.error('Error in notification callback:', error);
                }
            });
        }
        
        return notification;
    }
    
    notifyDevicePairing(deviceId, success) {
        return this.notify('device.pairing', {
            deviceId,
            success,
            message: success ? 'Device paired successfully' : 'Device pairing failed'
        });
    }
    
    notifyDeviceError(deviceId, error) {
        return this.notify('device.error', {
            deviceId,
            error: error.message || error,
            timestamp: new Date().toISOString()
        });
    }
    
    notifySystemWarning(message) {
        return this.notify('system.warning', {
            message,
            timestamp: new Date().toISOString()
        });
    }
    
    notifySystemError(error) {
        return this.notify('system.error', {
            error: error.message || error,
            timestamp: new Date().toISOString()
        });
    }
    
    getNotifications(limit = 100) {
        return this.notifications.slice(-limit);
    }
    
    getNotificationsByEvent(event, limit = 100) {
        return this.notifications
            .filter(n => n.event === event)
            .slice(-limit);
    }
    
    clearNotifications() {
        this.notifications = [];
    }
}

module.exports = NotificationSystem;
