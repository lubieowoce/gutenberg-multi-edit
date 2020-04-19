<?php
/**
 * Plugin Name: Gutenberg Multi-Edit
 * Version: 0.1.0
 * Description: Edit multiple blocks at once
 * License: GPLv3 or later
 * Author: Janka Uryga
 */

add_action('init', function () {
    $asset_file = include(plugin_dir_path(__FILE__).'build/index.asset.php');
    wp_register_script(
        'gutenberg-multi-edit',
        plugins_url('build/index.js', __FILE__),
        $asset_file['dependencies'],
        $asset_file['version']
    );
});
 
add_action('enqueue_block_editor_assets', function () {
    wp_enqueue_script('gutenberg-multi-edit');
});
