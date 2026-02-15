# Runa's Vencord Plugins

This repository will host all of the plugins that I make for [Vencord](https://vencord.dev)!

>[!NOTE] 
>### Current Plugins:
- [x] [SendYourFiles](https://github.com/RunaHehe/Vencord-Plugins/tree/main/SendYourFiles)
<br/>


## How to Install?
#### Cloning Vencord
To install these plugins you, need to clone Vencord (or whatever you use).

```bash
git clone https://github.com/Vendicated/Vencord
```
> [!WARNING]
> Ensure you have `git` installed.

Switch to the cloned folder with
```bash
cd Vencord
```
##
#### Install the Plugin

Clone this repository with 
```js
git clone https://github.com/RunaHehe/Vencord-Plugins
```

1. Move the wanted plugin from the created `plugins/userplugins` folder into the `vencord/src` folder.
2. Ensure it's structured as `[vencord]/src/userplugins/[PLUGIN NAME]/[...files]`
3. (**optional**) Delete all other files.

##
#### Installing Dependencies
Run `install` to install all dependencies
```js
pnpm install
```
> [!NOTE]
> If this command fails try using the `--force` flag, ensure `pnpm` is installed with `npm install -g pnpm`!

##
#### Building Vencord
Build Vencord with the `build` command:
```bash
pnpm run build
```
##
#### Injecting
Inject Vencord into your Discord client with `inject` (if not done yet / make sure Discord is **fully** closed!)

```bash
pnpm run inject
```

#
#### 🎉 That's it! You successfully installed your plugin..!

> [!NOTE]
> If you don't see the plugin, make sure it's enabled in your Settings (`Settings > Vencord (Tab) > Plugins > [Plugin Name]`)!

<h6>now explode muahahaha :3</h6> <img src="https://cdn.discordapp.com/emojis/1105406110724268075.webp" width="96" height="96" />

