const fs = require('fs');
const path = require('path');

const SRC_DIR = __dirname;
const DIST_DIR = path.join(SRC_DIR, 'dist');
const DIST_ASSETS = path.join(DIST_DIR, 'assets');
const DIST_IMAGES = path.join(DIST_ASSETS, 'images');

console.log('--- Starting Aspire Site Build Pipeline ---');

// Helper to ensure directories exist
function ensureDirectoryExistence(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}

// Helper to recursively copy directories
function copyDirSync(src, dest) {
    ensureDirectoryExistence(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else if (entry.isFile()) {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Simple CSS Minifier
function minifyCSS(cssContent) {
    return cssContent
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove newlines and multiple spaces
        .replace(/\s+/g, ' ')
        // Remove spaces before/after structural chars
        .replace(/\s*([\{\}:;,])\s*/g, '$1')
        // Remove last semicolon in block
        .replace(/;}/g, '}')
        .trim();
}

// Simple JS Minifier (Removes comments and basic spacing safely)
function minifyJS(jsContent) {
    return jsContent
        // Remove block comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove single-line comments (careful with URLs inside comments)
        .split('\n')
        .map(line => {
            // Strip single-line comments if they don't look like URLs
            const commentIdx = line.indexOf('//');
            if (commentIdx !== -1) {
                const beforeComment = line.substring(0, commentIdx);
                if (!beforeComment.match(/https?:$/)) {
                    return beforeComment;
                }
            }
            return line;
        })
        .join('\n')
        // Remove duplicate empty lines and trim
        .replace(/\n\s*\n/g, '\n')
        .trim();
}

try {
    // 1. Create clean directories
    ensureDirectoryExistence(DIST_DIR);
    ensureDirectoryExistence(DIST_ASSETS);
    ensureDirectoryExistence(DIST_IMAGES);

    // 2. Minify CSS
    console.log('Minifying style.css...');
    const rawCSS = fs.readFileSync(path.join(SRC_DIR, 'style.css'), 'utf-8');
    const minCSS = minifyCSS(rawCSS);
    fs.writeFileSync(path.join(DIST_ASSETS, 'style.min.css'), minCSS, 'utf-8');
    console.log(`CSS minified: ${(rawCSS.length / 1024).toFixed(2)} KB -> ${(minCSS.length / 1024).toFixed(2)} KB`);

    // 3. Clean and optimize JS
    console.log('Optimizing script.js...');
    const rawJS = fs.readFileSync(path.join(SRC_DIR, 'script.js'), 'utf-8');
    const minJS = minifyJS(rawJS);
    fs.writeFileSync(path.join(DIST_ASSETS, 'script.min.js'), minJS, 'utf-8');
    console.log(`JS optimized: ${(rawJS.length / 1024).toFixed(2)} KB -> ${(minJS.length / 1024).toFixed(2)} KB`);

    // 4. Copy Local Images
    const localImagesSrc = path.join(SRC_DIR, 'assets', 'images');
    if (fs.existsSync(localImagesSrc)) {
        console.log('Copying local images to dist...');
        copyDirSync(localImagesSrc, DIST_IMAGES);
        console.log('Images copied successfully.');
    } else {
        console.log('Warning: assets/images directory not found. Skipping image copy.');
    }

    // 5. Copy robots.txt and sitemap.xml to root
    const robotsPath = path.join(SRC_DIR, 'robots.txt');
    const sitemapPath = path.join(SRC_DIR, 'sitemap.xml');

    if (fs.existsSync(robotsPath)) {
        fs.copyFileSync(robotsPath, path.join(DIST_DIR, 'robots.txt'));
        console.log('Copied robots.txt to dist root.');
    }
    if (fs.existsSync(sitemapPath)) {
        fs.copyFileSync(sitemapPath, path.join(DIST_DIR, 'sitemap.xml'));
        console.log('Copied sitemap.xml to dist root.');
    }

    // 6. Process HTML Files
    const htmlFiles = [
        'index.html',
        'camisetas-personalizadas-sorocaba.html',
        'impressao-dtf-sorocaba.html',
        'uniformes-profissionais-sorocaba.html'
    ];

    htmlFiles.forEach(file => {
        const filePath = path.join(SRC_DIR, file);
        if (fs.existsSync(filePath)) {
            let htmlContent = fs.readFileSync(filePath, 'utf-8');

            // Replace CSS path
            htmlContent = htmlContent.replace(
                '<link rel="stylesheet" href="style.css">',
                '<link rel="stylesheet" href="assets/style.min.css">'
            );

            // Replace JS path
            htmlContent = htmlContent.replace(
                '<script type="module" src="script.js"></script>',
                '<script type="module" src="assets/script.min.js">'
            );

            // Output direct file to dist/
            fs.writeFileSync(path.join(DIST_DIR, file), htmlContent, 'utf-8');
            console.log(`Production ${file} generated in dist/`);

            // Also output clean URL directory (e.g. dist/camisetas-personalizadas-sorocaba/index.html)
            if (file !== 'index.html') {
                const slug = file.replace('.html', '');
                const cleanFolder = path.join(DIST_DIR, slug);
                ensureDirectoryExistence(cleanFolder);

                let cleanHtml = fs.readFileSync(filePath, 'utf-8');
                cleanHtml = cleanHtml.replace(
                    '<link rel="stylesheet" href="style.css">',
                    '<link rel="stylesheet" href="../assets/style.min.css">'
                );
                cleanHtml = cleanHtml.replace(
                    '<script type="module" src="script.js"></script>',
                    '<script type="module" src="../assets/script.min.js">'
                );

                fs.writeFileSync(path.join(cleanFolder, 'index.html'), cleanHtml, 'utf-8');
                console.log(`Clean URL ${slug}/index.html generated in dist/`);
            }
        }
    });

    console.log('--- Build Completed Successfully! ---');
    console.log('Ready to publish the contents of the "dist" directory.');

} catch (error) {
    console.error('Error during build execution:', error);
    process.exit(1);
}
