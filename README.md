# gutenberg-multi-edit 0.1.0

**Edit multiple Gutenberg blocks at once!**

This plugin is currently in alpha stage. Most things should work fine, but they might also crash and fail in weird ways. Feedback and contributions welcome!

*(some stuff changed since i made the gifs, but re-recording them is a hassle)*

## Features

#### Apply alignment and other settings to multiple blocks at once

<img src="https://user-images.githubusercontent.com/13698226/79565095-4052f780-80b0-11ea-85dc-cbc9188a3a68.gif">

Block-type-specific settings appear in the toolbar/inspector when you select multiple blocks of the same type. Settings provided by plugins may or may not work depending on the plugin's implementation.


#### Apply formatting to multiple blocks at once

<img src="https://user-images.githubusercontent.com/13698226/79638837-fc332600-8187-11ea-8aa2-ec9c6f95c1f1.gif">

Currently, multi-formatting only works for core blocks (paragraph, heading, quote, etc.). Formats provided by plugins may or may not work depending on the plugin's implementation.

## Installation

```shell
git clone https://github.com/lubieowoce/gutenberg-multi-edit && cd gutenberg-multi-edit
npm install && npm run build
```

Then, copy `build` and `plugin.php` into `gutenberg-multi-edit` in your WP plugins folder. *(i'll try to set up automated github releases soon to make this easier)*
