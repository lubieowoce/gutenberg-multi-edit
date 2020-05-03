<?php
/**
 * Plugin Name: Gutenberg Multi-Edit
 * Version: 0.1.0
 * Description: Edit multiple blocks at once
 * License: GPLv3 or later
 * Author: Janka Uryga
 */

add_action('init', function () {
    $script_asset = include(plugin_dir_path(__FILE__).'build/index.asset.php');
    wp_register_script(
        'gutenberg-multi-edit',
        plugins_url('build/index.js', __FILE__),
        $script_asset['dependencies'],
        $script_asset['version']
    );

    $style_asset = @include(plugin_dir_path(__FILE__).'build/editor.asset.php') ?? null;
    if ($style_asset) {
        wp_register_style(
            'gutenberg-multi-edit-style',
            plugins_url('build/editor.css', __FILE__),
            [],
            $style_asset['version']
        );
    }
});
 
add_action('enqueue_block_editor_assets', function () {
    wp_enqueue_script('gutenberg-multi-edit');
    wp_enqueue_style('gutenberg-multi-edit-style');
});
