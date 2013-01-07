/**
Javascript plugin to allow annotations on any page.

- Works on IE9+, Chrome, Firefox, iPad. Zepto / jQuery required
- Click the annotator to start drawing: line, rect or text

To use it in your HTML file:

1. Ensure that bootstrap.css and jquery.min.js are present
2. Add <script class="annogram" src="annotate.js" data-selector=".mainbody"></script> at the end

Parameters:
- class="annogram" is required for the script to work
- src="annotate.js" is the link to this script
- data-selector=".mainbody" is an optional selector that annotations are positioned against.
  If this container moves (e.g. if it's auto-centered), annotations move along with it.

IMPORTANT:
- The class=annogram should not be changed.
- bootstrap.min.css should be part of the main page.

=============================================================================
DO NOT REMOVE THESE FOLLOWING: THESE ARE NOT COMMENTS, THEY ARE INLINE FILES.
These are extracted and used by the library

>>> style.css
html.annogram .menu {
    position: fixed;
    right: 5px;
    top: 5px;
    z-index: 99999;
}

html.annogram .palette a {
    width: 1.5em;
    height: 1.5em;
    display: inline-block;
    border: 1px solid #888;
    border-width: 0 1px 1px 0;
    opacity: .7;
}
html.annogram .palette a:hover  { border-width: 1px 0 0 1px; opacity: 1; text-decoration: none; }
html.annogram .palette a.active { border-width: 1px 0 0 1px; opacity: 1; }

html.annogram .overlay {
    position: absolute;
    top: 0;
    width: 6000px;
    left: -2000px;
    display: none;
}

html.annogram .shape, html.annogram .palette { display: none; }
html.drawing .shape, html.drawing .palette { display: inline; }
html.waiting .shape, html.waiting .palette { display: none; }

html.drawing .overlay { display: block; cursor: crosshair; background-color: rgba(0,0,0,.01); }
html.waiting .overlay { cursor: auto; background-color: rgba(0,0,0,0); pointer-events: none; }
html.drawing div.overlay { pointer-events: none; }
html.drawing div.overlay .editable { pointer-events: auto; }
html.drawing .overlay * { cursor: auto; }
html.drawing .overlay line { stroke-width: 1.5; }
html.drawing .overlay rect { fill: rgba(0,0,0,.01); }
html.drawing .overlay .editable { position: absolute; }
html.drawing .overlay line:hover,
html.drawing .overlay rect:hover { stroke: red; stroke-width: 4; }
html.drawing .overlay .editable:hover { border: 4px solid red; }
@media print {
    html.annogram .menu { display: none; }
    html.drawing .overlay { background-color: rgba(0,0,0,0); }
}
<<< style.css

>>> menu.html
<div class="menu">
 <span class="palette">
   <a href="#" data-color="#4f81bd" data-bg="rgba( 79, 129, 189, 0.8)" class="active color">&#160;</a>
   <a href="#" data-color="#c0504d" data-bg="rgba(192,  80,  77, 0.8)" class="color">&#160;</a>
   <a href="#" data-color="#9bbb59" data-bg="rgba(155, 187,  89, 0.8)" class="color">&#160;</a>
   <a href="#" data-color="#444444" data-bg="rgba( 68,  68,  68, 0.8)" class="color">&#160;</a>
 </span>
 <span class="btn-group">
  <a href="#" data-plugin="Text" class="shape btn btn-primary btn-small">Text</a>
  <a href="#" data-plugin="Rect" class="shape btn btn-primary btn-small">Rect</a>
  <a href="#" data-plugin="Line" class="shape btn btn-primary btn-small active">Line</a>
 </span>
 <a href="#" class="draw btn btn-primary btn-small">Annotate</a>
</div>
<<< menu.html

>>> svg.html
<svg class="overlay" xmlns="http://www.w3.org/2000/svg" width="100%" height="">
  <defs>
    <marker id="Triangle"
      viewBox="0 0 10 10" refX="0" refY="5"
      markerUnits="strokeWidth"
      markerWidth="8" markerHeight="6"
      orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0,0,0,.5)"/>
    </marker>
  </defs>
</svg>
<<< svg.html

**/

$(function() {

// Ensure that this module is loaded only once
var UID = '.annogram';
if ($('html').is(UID)) { return; }
else { $('html').addClass(UID.slice(1)); }


// $$('rect') creates an SVG <rect>
var $$ = function(tag, attrs) {
    var el = $(document.createElementNS('http://www.w3.org/2000/svg', tag));
    if (attrs) { el.attr(attrs); }
    return el;
};

// Treats Javascript comments inside text as multipart files.
function multipart(text) {
    var comments = text.match(/\/\**[^]*\**\//) || [];
    var file_start = '>>>\\s*';
    var file_end = '<<<\\s*';
    var re_file_start = new RegExp(file_start);
    var regex = new RegExp(file_start + '(\\S+)[^]*' + file_end + '\\1', 'g');
    for (var templates={}, j=0, comment; comment=comments[j]; j++) {
        var blocks = comments[0].match(regex);
        for (var i=0, block; block=blocks[i]; i++) {
            var lines = block.split('\n');
            key = lines[0].replace(re_file_start, '');
            templates[key] = lines.slice(1, -1).join('\n');
        }
    }
    return templates;
}
$.get($('script.annogram').attr('src'), function(text) {
    init(multipart(text));
});

// Annotation code starts here
var Plugins = {};
function init(files) {
    // Add styles
    $('<style>' + files['style.css'] + '</style>').appendTo('head');

    var menu = $(files['menu.html']).appendTo('body');

    // When the 'Annotate' button is clicked, cycle between 3 states:
    // 0. html.annogram: no annotations visible
    // 1. html.annogram.drawing: annotations visible, user can draw
    // 2. html.annogram.drawing.waiting: annotations visible, user cannot draw
    $('a.draw', menu).on('click', function(e) {
        e.preventDefault();
        var $html = $('html'), $this = $(this);
        if ($html.is('.waiting')) {
            $html.removeClass('drawing waiting');
            $this.removeClass('active');
        } else if ($html.is('.drawing')) {
            $html.addClass('waiting');
            $this.addClass('active');
        } else {
            $html.addClass('drawing');
            $this.addClass('active');
        }
    });

    // Clicking on the menu makes the item active. That's all here.
    $('a.shape', menu).on('click', function(e) {
        e.preventDefault();
        $('a.shape', menu).removeClass('active');
        $(this).addClass('active');
    });

    // Set the palette colours. When clicked, make it active.
    $('.palette a.color', menu).each(function() {
        $(this).css('background-color', $(this).data('color'));
    }).on('click', function(e) {
        e.preventDefault();
        $('.palette a.color', menu).removeClass('active');
        $(this).addClass('active');
    });

    // Create the overlay. This is the parent of all the SVG elements we'll draw.
    var $selector = $($('script.annogram').data('selector') || 'body')
        .css('position', 'relative');
    var overlay = $(files['svg.html'])
        .css('height', Math.max($(document).height(), 2000))
        .appendTo($selector);
    $('<div class="overlay">').insertAfter(overlay);

    var onClick = function(e) {
        // If some other handler is already handling clicks, ignore.
        if (overlay.data('editing')) {
            return;
        }
        // Click on overlay to create a new object.
        if (overlay.is(e.target)) {
            Plugins[$('.active.shape', menu).data('plugin')].create(e, overlay);
        }
        // CLick on an existing object to edit it
        else {
            Plugins[$(e.target).data('plugin')].update(e, overlay);
        }
    };
    overlay.on('click', onClick);
}

Plugins.Rect = {
    create: function(e, overlay) {
        var obj = $$('rect', {
            x: e.offsetX,
            y:e.offsetY,
            rx:10,
            ry:10,
            width:100,
            height: 100,
            stroke: $('.color.active').data('color')
        });
        obj.data('plugin', 'Rect')
            .appendTo(overlay)
            .trigger('click');
    },
    update: function(e, overlay) {
        var $target = $(e.target);
        var x = $target.attr('x');
        var y = $target.attr('y');
        overlay.data('editing', true)
          .on('mousemove.Rect', function(e) {
            var w = e.offsetX - x;
            var h = e.offsetY - y;
            // In case the cursor goes beyond the top / left, use transforms.
            var t = '';
            if (w < 0) { w = -w; t += 'scale(-1 1) translate(-' + 2*x + ' 0) '; }
            if (h < 0) { h = -h; t += 'scale(1 -1) translate(0 -' + 2*y + ') '; }
            $target.attr({width: w, height: h, transform: t});
          }).on('click.Rect', function(e) {
            overlay.data('editing', false).off('.Rect');
            $('html').off('.Rect');
          });
        $('html').on('keyup.Rect', function(e) {
            if ((e.keyCode == 46) || (e.keyCode == 27)) {
                overlay.trigger('click');
                $target.remove();
            }
        });
    }
};

Plugins.Line = {
    create: function(e, overlay) {
        var obj = $$('line', {
            x1: e.offsetX,
            y1: e.offsetY,
            x2: e.offsetX,
            y2: e.offsetY,
            stroke: $('.color.active').data('color'),
            'marker-end': 'url(#Triangle)'
        });
        obj.data('plugin', 'Line')
            .appendTo(overlay)
            .trigger('click');
    },
    update: function(e, overlay) {
        var $target = $(e.target);
        overlay.data('editing', true)
          .on('mousemove.Line', function(e) {
            $target.attr({x2: e.offsetX, y2: e.offsetY});
          }).on('click.Line', function(e) {
            overlay.data('editing', false).off('.Line');
            $('html').off('.Line');
          });
        $('html').on('keyup.Line', function(e) {
            if ((e.keyCode == 46) || (e.keyCode == 27)) {
                overlay.trigger('click');
                $target.remove();
            }
        });
    }
};

Plugins.Text = {
    create: function(e, overlay) {
        var obj = $('<div>')
            .attr('contentEditable', 'true')
            .addClass('editable')
            .css({left: e.offsetX, top: e.offsetY, width: '20em', minHeight: '2em', padding: '.2em .5em',
                // border: '1px solid ' + $('.color.active').data('color'),
                color: '#fff',
                background: $('.color.active').data('bg')
            });
        obj.data('plugin', 'Text')
            .appendTo(overlay.next())
            .on('keyup', function(e) {
                if (e.keyCode == 27) {
                    obj.remove();
                }
            });
    }
};

});
