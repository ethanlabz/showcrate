import ffmpeg from 'ffmpeg-static';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

const videos = [
  { input: 'src/components/3d/book.mp4', outputDir: 'public/videos/sequence-1' },
  { input: 'src/components/3d/book2.mp4', outputDir: 'public/videos/sequence-2' }
];

async function extract() {
  for (const v of videos) {
    if (!fs.existsSync(v.outputDir)) {
      fs.mkdirSync(v.outputDir, { recursive: true });
    }
    
    // Check if frames already exist to save time
    const files = fs.readdirSync(v.outputDir);
    if (files.length > 0) {
      console.log(`Frames already exist in ${v.outputDir}. Skipping.`);
      continue;
    }

    console.log(`Extracting frames from ${v.input} to ${v.outputDir}...`);
    
    // WebP extraction. -qscale 60 for good quality/size ratio.
    const args = [
      '-i', v.input,
      '-vf', 'scale=1280:-1',
      '-c:v', 'libwebp',
      '-qscale:v', '60',
      path.join(v.outputDir, 'frame_%04d.webp')
    ];
    
    await new Promise((resolve, reject) => {
      execFile(ffmpeg, args, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error processing ${v.input}:`, error);
          reject(error);
        } else {
          console.log(`Finished ${v.input}`);
          resolve();
        }
      });
    });
  }
}

extract().then(() => console.log('All done!')).catch(console.error);
