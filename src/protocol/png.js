define(function(require, exports, module) {
    var kity = require('../core/kity');
    var data = require('../core/data');
    var Promise = require('../core/promise');

    var DomURL = window.URL || window.webkitURL || window;

    function loadImage(url, callback) {
        return new Promise(function(resolve, reject) {
            var image = document.createElement('img');
            image.onload = function() {
                resolve(this);
            };
            image.onerror = function(err) {
                reject(err);
            };
            image.crossOrigin = '';
            image.src = url;
        });
    }

    function getSVGInfo(minder) {
        var paper = minder.getPaper(),
            paperTransform,
            domContainer = paper.container,
            svgXml,
            svgContainer,
            svgDom,

            renderContainer = minder.getRenderContainer(),
            renderBox = renderContainer.getRenderBox(),
            width = renderBox.width + 1,
            height = renderBox.height + 1,

            blob, svgUrl, img;

        // 保存原始变换，并且移动到合适的位置
        paperTransform = paper.shapeNode.getAttribute('transform');
        paper.shapeNode.setAttribute('transform', 'translate(0.5, 0.5)');
        renderContainer.translate(-renderBox.x, -renderBox.y);

        // 获取当前的 XML 代码
        svgXml = paper.container.innerHTML;

        // 回复原始变换及位置
        renderContainer.translate(renderBox.x, renderBox.y);
        paper.shapeNode.setAttribute('transform', paperTransform);

        // 过滤内容
        svgContainer = document.createElement('div');
        svgContainer.innerHTML = svgXml;
        svgDom = svgContainer.querySelector('svg');
        svgDom.setAttribute('width', renderBox.width + 1);
        svgDom.setAttribute('height', renderBox.height + 1);
        svgDom.setAttribute('style', 'font-family: Arial, "Microsoft Yahei","Heiti SC";');

        svgContainer = document.createElement('div');
        svgContainer.appendChild(svgDom);

        svgXml = svgContainer.innerHTML;

        // Dummy IE
        svgXml = svgXml.replace(' xmlns="http://www.w3.org/2000/svg" ' +
            'xmlns:NS1="" NS1:ns1:xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:NS2="" NS2:xmlns:ns1=""', '');

        // svg 含有 &nbsp; 符号导出报错 Entity 'nbsp' not defined
        svgXml = svgXml.replace(/&nbsp;/g, '&#xa0;');

        blob = new Blob([svgXml], {
            type: 'image/svg+xml'
        });

        svgUrl = DomURL.createObjectURL(blob);

        //svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgXml);

        return {
            width: width,
            height: height,
            dataUrl: svgUrl,
            xml: svgXml
        };
    }


    function encode(json, minder) {

        var resultCallback;

        /* 绘制 PNG 的画布及上下文 */
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        /* 尝试获取背景图片 URL 或背景颜色 */
        var bgDeclare = minder.getStyle('background').toString();
        var bgUrl = /url\((.+)\)/.exec(bgDeclare);
        var bgColor = kity.Color.parse(bgDeclare);

        /* 获取 SVG 文件内容 */
        var svgInfo = getSVGInfo(minder);
        var width = svgInfo.width;
        var height = svgInfo.height;
        var svgDataUrl = svgInfo.dataUrl;

        /* 画布的填充大小 */
        var padding = 20;

        canvas.width = width + padding * 2;
        canvas.height = height + padding * 2;

        function fillBackground(ctx, style) {
            ctx.save();
            ctx.fillStyle = style;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        function drawImage(ctx, image, x, y) {
            ctx.drawImage(image, x, y);
        }

        function generateDataUrl(canvas) {
            return canvas.toDataURL('png');
        }

        function drawSVG() {
            return loadImage(svgDataUrl).then(function(svgImage) {
                drawImage(ctx, svgImage, padding, padding);
                DomURL.revokeObjectURL(svgDataUrl);
                return generateDataUrl(canvas);
            });
        }

        if (bgUrl) {
            return loadImage(bgUrl[1]).then(function(image) {
                fillBackground(ctx, ctx.createPattern(image, 'repeat'));
                return drawSVG();
            });
        } else {
            fillBackground(ctx, bgColor.toString());
            return drawSVG();
        }
    }

    data.registerProtocol('png', module.exports = {
        fileDescription: 'PNG 图片',
        fileExtension: '.png',
        mineType: 'image/png',
        dataType: 'base64',
        encode: encode
    });
});