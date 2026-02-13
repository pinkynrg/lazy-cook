const config = {
  "baseFontSize": 16,
  "targetPath": "src",
  "excludePaths": ["node_modules", "dist", ".next"],
  "targetExtensions": ["css", "scss"],
  "roundStrategy": {
    "onTie": 'up',
    "mode": 'on'
  },
  "getGenericVariableName": (sizeInPx: number) => `--space-${sizeInPx / 4}`.replace('.', ''),
  "transformers": [],
  "properties": {
    // Font sizes - keep in rem
    "font-size": { 
      "unit": "rem",
      "transform": true,
      "convert": true,
      "round": true,
    },
    
    // Dimensions - use rem for scalability
    "width": { "unit": "rem", "convert": true, "round": true },
    "min-width": { "unit": "rem", "convert": true, "round": true },
    "max-width": { "unit": "rem", "convert": true, "round": true },
    "height": { "unit": "rem", "convert": true, "round": true },
    "min-height": { "unit": "rem", "convert": true, "round": true },
    "max-height": { "unit": "rem", "convert": true, "round": true },
    
    // Spacing - use px for precision
    "padding": { "unit": "px", "convert": true, "round": true },
    "padding-top": { "unit": "px", "convert": true, "round": true },
    "padding-right": { "unit": "px", "convert": true, "round": true },
    "padding-bottom": { "unit": "px", "convert": true, "round": true },
    "padding-left": { "unit": "px", "convert": true, "round": true },
    "margin": { "unit": "px", "convert": true, "round": true },
    "margin-top": { "unit": "px", "convert": true, "round": true },
    "margin-right": { "unit": "px", "convert": true, "round": true },
    "margin-bottom": { "unit": "px", "convert": true, "round": true },
    "margin-left": { "unit": "px", "convert": true, "round": true },
    "gap": { "unit": "px", "convert": true, "round": true },
    "column-gap": { "unit": "px", "convert": true, "round": true },
    "row-gap": { "unit": "px", "convert": true, "round": true },
    
    // Borders - use px
    "border": { "unit": "px", "convert": true, "round": false },
    "border-top": { "unit": "px", "convert": true, "round": false },
    "border-right": { "unit": "px", "convert": true, "round": false },
    "border-bottom": { "unit": "px", "convert": true, "round": false },
    "border-left": { "unit": "px", "convert": true, "round": false },
    "border-width": { "unit": "px", "convert": true, "round": false },
    "border-radius": { "unit": "px", "convert": true, "round": true },
    "outline": { "unit": "px", "convert": true, "round": false },
    "outline-width": { "unit": "px", "convert": true, "round": false },
    
    // Shadows - use px
    "box-shadow": { "unit": "px", "convert": true, "round": true },
    "text-shadow": { "unit": "px", "convert": true, "round": true },
    
    // Typography - use rem
    "line-height": { "unit": "rem", "convert": true, "round": true },
    "letter-spacing": { "unit": "rem", "convert": true, "round": true },
    "word-spacing": { "unit": "rem", "convert": true, "round": true },
    "text-indent": { "unit": "rem", "convert": true, "round": true },
    
    // Positioning - use px
    "top": { "unit": "px", "convert": true, "round": true },
    "right": { "unit": "px", "convert": true, "round": true },
    "bottom": { "unit": "px", "convert": true, "round": true },
    "left": { "unit": "px", "convert": true, "round": true },
    
    // Grid/Flexbox - use rem
    "flex-basis": { "unit": "rem", "convert": true, "round": true },
    "grid-template-columns": { "unit": "rem", "convert": true, "round": true },
    "grid-template-rows": { "unit": "rem", "convert": true, "round": true },
    "grid-auto-columns": { "unit": "rem", "convert": true, "round": true },
    "grid-auto-rows": { "unit": "rem", "convert": true, "round": true },
    "grid-gap": { "unit": "px", "convert": true, "round": true },
    
    // Transforms - use rem
    "transform": { "unit": "rem", "convert": true, "round": true },
    "translate": { "unit": "rem", "convert": true, "round": true },
    "translateX": { "unit": "rem", "convert": true, "round": true },
    "translateY": { "unit": "rem", "convert": true, "round": true },
    "transform-origin": { "unit": "rem", "convert": true, "round": true },
    
    // Background - use px
    "background-position": { "unit": "px", "convert": true, "round": true },
    "background-size": { "unit": "px", "convert": true, "round": true },
    
    // Other
    "border-spacing": { "unit": "px", "convert": true, "round": true },
    "perspective": { "unit": "rem", "convert": true, "round": true },
    "clip-path": { "unit": "rem", "convert": true, "round": true },
    "stroke-width": { "unit": "px", "convert": true, "round": false },
    "column-rule": { "unit": "px", "convert": true, "round": true },
  },
  "sizesInPixel": [
    0,
    1,
    2,
    4,
    8,
    12,
    16,
    20,
    24,
    28,
    32,
    36,
    40,
    44,
    48,
    52,
    56,
    60,
    64,
    80,
    96,
    112,
    128,
    144,
    160,
    176,
    192,
    208,
    224,
    240,
    256,
    280,
    320,
    384,
    480,
    640,
    800,
    960,
    1200,
    1440,
  ],
}

export default config;
