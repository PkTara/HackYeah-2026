/**
 * Web host entry: renders the shared app with react-native-web
 * ("react-native" is aliased to it in vite.config.js).
 */
import { AppRegistry } from 'react-native';
import { App, isRouteName } from '@hackyeah/app';
import { createBackend, createMedia } from '@hackyeah/data';
import { capabilities } from '@hackyeah/platform';

// Deep link for development and demos: /#Hands opens the Hands screen.
const hash = window.location.hash.slice(1);
const initialRoute = isRouteName(hash) ? hash : undefined;

// Where data is saved. With VITE_MONKEY_API_URL set (for example
// http://127.0.0.1:8000, the FastAPI server in backend/) the app saves to
// that API, and the camera screens send media there after consent. Without
// it everything stays in this browser and the camera screens say they need
// the server.
const server = { apiBaseUrl: import.meta.env.VITE_MONKEY_API_URL };
const backend = createBackend(capabilities.storage, server);
const media = createMedia(capabilities.storage, server);

AppRegistry.registerComponent('HackYeahApp', () => () => (
  <App
    initialRoute={initialRoute}
    backend={backend}
    media={media}
    backendConfig={server}
  />
));
AppRegistry.runApplication('HackYeahApp', {
  rootTag: document.getElementById('root'),
});
