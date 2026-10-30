import { Config } from '@remotion/cli/config';
// The video project (folder with storyboard.json, frames/, vo/, cut.json, assets/) becomes the publicDir.
const project = process.env.DEMO_PROJECT;
if (!project) throw new Error('DEMO_PROJECT is not set (path to the video project folder)');
Config.setPublicDir(project);
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
