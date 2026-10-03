/**
 * Web host entry: renders the shared app with react-native-web
 * ("react-native" is aliased to it in vite.config.js).
 */
import { AppRegistry } from 'react-native';
import { App, isRouteName } from '@hackyeah/app';

// Deep link for development and demos: /#Hands opens the Hands screen.
const hash = window.location.hash.slice(1);
const initialRoute = isRouteName(hash) ? hash : undefined;

AppRegistry.registerComponent('HackYeahApp', () => () => (
  <App initialRoute={initialRoute} />
));
AppRegistry.runApplication('HackYeahApp', {
  rootTag: document.getElementById('root'),
});
