import {RNOHPackage} from '@rnoh/react-native-openharmony';
import {UITurboModule} from '@rnoh/react-native-openharmony/ts';
import type {UITurboModuleContext, TurboModuleFactory} from '@rnoh/react-native-openharmony/ts';
import {camera, cameraPicker} from '@kit.CameraKit';
import {fileIo as fs, fileUri} from '@kit.CoreFileKit';
import {util} from '@kit.ArkTS';
import {cameraFramePath, cameraVideoPath, assertCameraFrameSize, assertCameraVideoSize} from './CameraMediaPolicy';

class VideoFile {
  uri: string;
  filename: string;
  constructor(uri: string, filename: string) {
    this.uri = uri;
    this.filename = filename;
  }
}

class CameraMediaTurboModule extends UITurboModule {
  private recording: boolean = false;

  async readFrame(uri: string): Promise<string> {
    const path = cameraFramePath(uri, this.ctx.uiAbilityContext.cacheDir);
    const file = await fs.open(path, fs.OpenMode.READ_ONLY);
    try {
      const stat = await fs.stat(file.fd);
      assertCameraFrameSize(stat.size);
      const buffer = new ArrayBuffer(stat.size);
      const length = await fs.read(file.fd, buffer);
      if (length !== stat.size) {throw new Error('Camera frame could not be read completely.');}
      return new util.Base64Helper().encodeToStringSync(new Uint8Array(buffer));
    } finally {
      await fs.close(file);
    }
  }

  async releaseFrame(uri: string): Promise<void> {
    const path = cameraFramePath(uri, this.ctx.uiAbilityContext.cacheDir);
    if (fs.accessSync(path)) {await fs.unlink(path);}
  }

  async releaseVideo(uri: string): Promise<void> {
    const path = cameraVideoPath(uri, this.ctx.uiAbilityContext.cacheDir);
    if (fs.accessSync(path)) {await fs.unlink(path);}
  }

  async recordVideo(cameraType: string): Promise<VideoFile | null> {
    if (this.recording) {throw new Error('Video recording is already open.');}
    this.recording = true;
    const context = this.ctx.uiAbilityContext;
    const directory = `${context.cacheDir}/climbing-camera`;
    const filename = `climbing-${Date.now()}.mp4`;
    const path = `${directory}/${filename}`;
    try {
      if (!fs.accessSync(directory)) {fs.mkdirSync(directory);}
      // The system picker requires an existing writable sandbox destination.
      const file = fs.openSync(path, fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE);
      fs.closeSync(file);
      const profile: cameraPicker.PickerProfile = {
        cameraPosition: cameraType === 'front' ? camera.CameraPosition.CAMERA_POSITION_FRONT : camera.CameraPosition.CAMERA_POSITION_BACK,
        saveUri: fileUri.getUriFromPath(path),
        videoDuration: 30,
      };
      const result = await cameraPicker.pick(context, [cameraPicker.PickerMediaType.VIDEO], profile);
      if (result.resultCode !== 0) {await fs.unlink(path); return null;}
      if (!result.resultUri || result.mediaType !== cameraPicker.PickerMediaType.VIDEO) {
        throw new Error('The system camera did not return a video.');
      }
      const stat = await fs.stat(path);
      assertCameraVideoSize(stat.size);
      return new VideoFile(`file://${path}`, filename);
    } catch (error) {
      if (fs.accessSync(path)) {await fs.unlink(path);}
      throw error;
    } finally {
      this.recording = false;
    }
  }
}

export class CameraMediaPackage extends RNOHPackage {
  getUITurboModuleFactoryByNameMap(): Map<string, TurboModuleFactory<UITurboModule, UITurboModuleContext>> {
    return new Map<string, TurboModuleFactory<UITurboModule, UITurboModuleContext>>([
      ['ClimbingCameraMedia', (ctx: UITurboModuleContext) => new CameraMediaTurboModule(ctx)],
    ]);
  }
}
