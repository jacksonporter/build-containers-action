import { H as Handlebars, c as coreExports } from '../../index-DJe4DkTu.js';
import { execSync } from 'child_process';
import 'os';
import 'crypto';
import 'fs';
import 'path';
import 'http';
import 'https';
import 'net';
import 'tls';
import 'events';
import 'assert';
import 'util';
import 'stream';
import 'buffer';
import 'querystring';
import 'stream/web';
import 'node:stream';
import 'node:util';
import 'node:events';
import 'worker_threads';
import 'perf_hooks';
import 'util/types';
import 'async_hooks';
import 'console';
import 'url';
import 'zlib';
import 'string_decoder';
import 'diagnostics_channel';
import 'timers';

class StandardRepository {
    repositoryConfig;
    type = 'standard';
    constructor(repositoryConfig, templateValues) {
        const configTemplateFunc = Handlebars.compile(JSON.stringify(repositoryConfig));
        const resolvedConfig = configTemplateFunc({
            env: process.env,
            ...templateValues
        });
        this.repositoryConfig = JSON.parse(resolvedConfig);
    }
    getRepositoryConfig() {
        return this.repositoryConfig;
    }
    async login() {
        const repositoryConfig = this.getRepositoryConfig();
        if (repositoryConfig.password) {
            coreExports.setSecret(repositoryConfig.password);
        }
        coreExports.info(`Logging in to ${repositoryConfig.registry}`);
        try {
            execSync(`docker login ${repositoryConfig.registry} -u ${repositoryConfig.username} -p ${repositoryConfig.password}`, {
                stdio: 'inherit'
            });
        }
        catch (error) {
            coreExports.error(`Failed to login to ${repositoryConfig.registry}`);
            throw error;
        }
    }
}

export { StandardRepository, StandardRepository as default };
//# sourceMappingURL=standard.js.map
