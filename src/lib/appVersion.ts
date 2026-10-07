import packageJson from '../../package.json';

/**
 * The portal's version, read from `package.json` so a release bump shows up
 * without another edit. Settings → About shows it as "Version 1.5.0".
 */
export const APP_VERSION: string = packageJson.version;

/** The platform line on Settings → About. */
export const APP_PLATFORM = 'Talim Parents Web';
