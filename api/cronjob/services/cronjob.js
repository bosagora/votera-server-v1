'use strict';

const Redis = require('ioredis');
const Redlock = require('redlock');


module.exports = {
    async initialize() {
        if (!strapi.config.server.cron?.enabled) {
            return;
        }
        if (strapi.config.server.cron?.redis?.enable && 
            strapi.config.server.cron?.redis?.options) {
            const options = {
                ...strapi.config.server.cron?.redis?.options,
                retryStrategy: times => {
                    return Math.min(times * 50, 2000);
                }
            };
            
            const client = new Redis(options);
            const redlock = new Redlock([client], {
                driftFactor: 0.01,
                retryCount: 10,
                retryDelay: 200,
                retryJitter: 200,
            });

            this.client = client;
            this.redlock = redlock;
        }
    },
    async tryLock(resource, func) {
        if (!this.redlock) {
            try {
                await func();
                return true;
            } catch (err) {
                strapi.log.warn({ resource, err }, 'catch exception while trying lock');
                console.log(`${resource} catch exception : `, err);
                return false;
            }
        }

        try {
            const ttl = strapi.config.server.cron.ttl * 1000;

            let lock = await this.redlock.lock(resource, ttl);
            const tmid = setInterval(async () => {
                try {
                    lock = await lock.extend(ttl);
                } catch (err) {
                    throw err;
                }
            }, (strapi.config.server.cron.ttl / 2 * 1000));
            try {
                await func();
            } catch (err) {
                strapi.log.warn({ resource, err }, 'catch exception while processing function');
                console.log(`${resource} catch exception : `, err);
            }
            clearInterval(tmid);
            await lock.unlock();

            return true;
        } catch (err) {
            if (err.name && err.name === 'LockError' && err.attempts > 10) {
                // 10회 lock 실패시 그냥 조용히 리턴
                return false;
            }

            strapi.log.warn({ resource, err }, 'catch exception while trying lock');
            console.log(`${resource} catch exception : `, err);
            return false;
        }
    }
}
