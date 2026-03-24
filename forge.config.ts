import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { PublisherGithub } from '@electron-forge/publisher-github';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // 应用图标配置
    // macOS 使用 .icns 格式，Windows 使用 .ico 格式，Linux 使用 .png 格式
    // 图标文件应放在项目根目录的 assets 文件夹中
    icon: "src/assets/app_icon.generated.icns", // 不带扩展名，Electron 会自动查找对应平台的图标文件
    // 应用名称（会覆盖 package.json 中的 productName）
    name: "AI助理调试工具",
  },
  rebuildConfig: {},
  makers: [new MakerSquirrel({}), new MakerZIP({}, ["darwin"]), new MakerRpm({}), new MakerDeb({})],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: process.env["GITHUB_OWNER"] ?? "17607131520Aaron",
        name: process.env["GITHUB_REPO"] ?? "CodeForge-desktop",
      },
      generateReleaseNotes: true,
      // Use draft releases to avoid "immutable release" upload failures.
      // You can override with env: GITHUB_RELEASE_DRAFT=false
      draft: process.env["GITHUB_RELEASE_DRAFT"] !== "false",
      prerelease: process.env["GITHUB_RELEASE_PRERELEASE"] === "true",
    }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
