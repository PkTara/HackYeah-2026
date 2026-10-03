/**
 * Web host entry: renders the shared app with react-native-web
 * ("react-native" is aliased to it in vite.config.js).
 */
import { AppRegistry } from 'react-native';
import { App, isRouteName } from '@hackyeah/app';
import { createBackend } from '@hackyeah/data';
import { capabilities } from '@hackyeah/platform';

// Deep link for development and demos: /#Hands opens the Hands screen.
const hash = window.location.hash.slice(1);
const initialRoute = isRouteName(hash) ? hash : undefined;

// Where data is saved. With VITE_MONKEY_API_URL set (for example
// http://127.0.0.1:8000, the FastAPI server in backend/) the app saves to
// that API; without it everything stays in this browser.
const backend = createBackend(capabilities.storage, {
  apiBaseUrl: import.meta.env.VITE_MONKEY_API_URL,
});

AppRegistry.registerComponent('HackYeahApp', () => () => (
  <App initialRoute={initialRoute} backend={backend} />
));
AppRegistry.runApplication('HackYeahApp', {
  rootTag: document.getElementById('root'),
});
