/**
 * Native host entry (Android, iOS). The app itself lives in
 * ../../packages/app so other hosts (e.g. apps/web) can render the same thing.
 *
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import { App } from '@hackyeah/app';
import { name as appName } from './app.json';

// Screen uses the built-in SafeAreaView on purpose: it needs no extra native
// dependency (see packages/ui/src/components/Screen.tsx).
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

AppRegistry.registerComponent(appName, () => App);
