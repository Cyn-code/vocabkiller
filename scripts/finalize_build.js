const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const publicFriendsDir = path.join(projectRoot, 'public', 'data', 'friends');
const buildFriendsDir = path.join(projectRoot, 'build', 'data', 'friends');
const publicEpisodesDir = path.join(publicFriendsDir, 'episodes');
const buildEpisodesDir = path.join(buildFriendsDir, 'episodes');
const publicFriendsFiles = ['index.json', 'parse-warnings.json'];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function removeDsStoreFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      removeDsStoreFiles(entryPath);
      continue;
    }

    if (entry.name === '.DS_Store') {
      fs.rmSync(entryPath, { force: true });
    }
  }
}

ensureDir(buildFriendsDir);

for (const fileName of publicFriendsFiles) {
  const sourcePath = path.join(publicFriendsDir, fileName);
  const destinationPath = path.join(buildFriendsDir, fileName);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

removeIfExists(buildEpisodesDir);

if (fs.existsSync(publicEpisodesDir)) {
  fs.cpSync(publicEpisodesDir, buildEpisodesDir, { recursive: true });
}

removeDsStoreFiles(path.join(projectRoot, 'build'));
