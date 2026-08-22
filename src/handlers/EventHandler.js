"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandler = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class EventHandler {
    client;
    constructor(client) {
        this.client = client;
    }
    async load() {
        const eventsPath = (0, path_1.join)(__dirname, '../events');
        const files = this.loadDir(eventsPath);
        let count = 0;
        for (const file of files) {
            const event = require(file).default;
            if (event && event.name && event.execute) {
                const emitter = event.emitter === 'music' ? this.client.music : this.client;
                if (event.once) {
                    emitter.once(event.name, (...args) => event.execute(...args, this.client));
                }
                else {
                    emitter.on(event.name, (...args) => event.execute(...args, this.client));
                }
                count++;
            }
        }
        return `Loaded ${count} events.`;
    }
    loadDir(dir, fileList = []) {
        const files = (0, fs_1.readdirSync)(dir);
        for (const file of files) {
            const filePath = (0, path_1.join)(dir, file);
            if ((0, fs_1.statSync)(filePath).isDirectory()) {
                this.loadDir(filePath, fileList);
            }
            else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
                fileList.push(filePath);
            }
        }
        return fileList;
    }
}
exports.EventHandler = EventHandler;
