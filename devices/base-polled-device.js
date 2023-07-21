import RingDevice from './base-ring-device.js'
import utils from '../lib/utils.js'

// Base class for devices/features that communicate via HTTP polling interface (cameras/chime/modes)
export default class RingPolledDevice extends RingDevice {
    constructor(deviceInfo, category, primaryAttribute) {
        super(deviceInfo, category, primaryAttribute, 'polled')
        this.heartbeat = 3

        // Sevice data for Home Assistant device registry
        this.deviceData = {
            ids: [ this.deviceId ],
            name: this.device.name,
            mf: 'Ring',
            mdl: this.device.model
        }

        this.device.onData.subscribe((data) => {
            // Monitor Online-Offline
            if (data.hasOwnProperty('alerts')) {
                this.monitorAlerts(data.alerts)
            }
           // Reset heartbeat counter on every polled state
            if (this.isOnline()) { this.publishState(data) }
        })
    }

    // Monitor Connection alerts
    async monitorAlerts(alerts) {
        // Offline
        if ($this.availabilityState !== 'offline' && alerts.connection === 'offline') {
            this.offline()
        }
        // Online
        if (this.availabilityState !== 'online' && alerts.connection === 'online') {
            await this.online()
        }

    }
    // Publish device discovery, set online, and send all state data
    async publish() {
        await this.publishDiscovery()
        // Sleep for a few seconds to give HA time to process discovery message
        await utils.sleep(2)
        await this.online()
        this.publishState()
    }

    async getDeviceHistory(options) {
        try {
            const response = await this.device.restClient.request({
                method: 'GET',
                url: `https://api.ring.com/evm/v2/history/devices/${this.device.id}${this.getSearchQueryString({
                    capabilities: 'offline_event',
                    ...options,
                })}`
            })
            return response
        } catch (err) {
            this.debug(err)
            this.debug('Failed to retrieve device event history from Ring API')
        }
    }

    getSearchQueryString(options) {
        const queryString = Object.entries(options)
            .map(([key, value]) => {
            if (value === undefined) {
                return '';
            }
            return `${key}=${value}`;
        })
            .filter((x) => x)
            .join('&');
        return queryString.length ? `?${queryString}` : '';
    }
}
