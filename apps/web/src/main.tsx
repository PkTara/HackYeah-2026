/**
 * Web host entry: renders the shared app with react-native-web
 * ("react-native" is aliased to it in vite.config.js).
 */
import { AppRegistry } from 'react-native';
import { App } from '@hackyeah/app';

AppRegistry.registerComponent('HackYeahApp', () => App);
AppRegistry.runApplication('HackYeahApp', {
  rootTag: document.getElementById('root'),
});
