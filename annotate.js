/**
Javascript plugin to allow annotations on any page.

- Works on IE9+, Chrome, Firefox, iPad. Zepto / jQuery required
- Click the annotator to start drawing: line, rect or text

To use it, add this line to the end of the HTML template:

1. Ensure that bootstrap.css is presnt
2. Add <script class="annogram" src="annotate.js"></script>

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

html.annogram .overlay {
    position: absolute;
    width: 100%;
    top: 0;
    left: 0;
    display: none;
}

html.drawing .overlay { display: block; cursor: crosshair; background-color: rgba(0,0,0,.01); }
html.drawing div.overlay { pointer-events: none; }
html.drawing div.overlay textarea { pointer-events: auto; }
html.drawing .overlay * { cursor: auto; }
html.drawing .overlay line { stroke: rgba(0,0,0,.8); stroke-width: 3; }
html.drawing .overlay rect { fill: rgba(0,0,0,.01); stroke: #000; }
html.drawing .overlay textarea { background-color: #ffa; border:1px solid #fea; position: absolute; }
html.drawing .overlay line:hover,
html.drawing .overlay rect:hover { stroke: red; stroke-width: 4; }
html.drawing .overlay textarea:hover { border: 4px solid red; }
<<< style.css

>>> menu.html
<div class="menu">
 <span class="btn-group">
  <a href="#" data-plugin="Text" class="shape btn btn-primary btn-small">Text</a>
  <a href="#" data-plugin="Rect" class="shape btn btn-primary btn-small">Rect</a>
  <a href="#" data-plugin="Line" class="shape btn btn-primary btn-small">Line</a>
 </span>
 <a href="#" class="draw btn btn-primary btn-small">Annotate</a>
</div>
<<< menu.html

**/

(function(w, undefined) {

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
    $('a.shape', menu).hide();
    $('a.draw', menu).on('click', function(e) {
        $(this).toggleClass('active');
        $('a.shape', menu).toggle();
        e.preventDefault();
        $('html').toggleClass('drawing');
        // When we start drawing, click on the last shape
        if ($(this).is('.active')) {
            $('a.shape', menu).last().trigger('click');
        }
    });

    // Clicking on the menu makes the item active. That's all here.
    $('a.shape', menu).on('click', function(e) {
        e.preventDefault();
        $('a.shape', menu).removeClass('active');
        $(this).addClass('active');
    });

    // Create the overlay. This is the parent of all the SVG elements we'll draw.
    var overlay = $$('svg').add('<div>').attr('class', 'overlay')
        .css('height', Math.max($(document).height(), 2000))
        .appendTo('body')
        .filter('svg');
    window.overlay = overlay;

    var onClick = function(e) {
        // If some other handler is already handling clicks, ignore.
        if (overlay.data('editing')) {
            return;
        }
        // Click on overlay to create a new object.
        if (overlay.is(e.target)) {
            Plugins[$('.active', menu).data('plugin')].create(e, overlay);
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
        var obj = $$('rect', {x: e.pageX, y:e.pageY, width:100, height: 100});
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
            var w = e.pageX - x;
            var h = e.pageY - y;
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
        var obj = $$('line', {x1: e.pageX, y1:e.pageY, x2:e.pageX, y2: e.pageY});
        obj.data('plugin', 'Line')
            .appendTo(overlay)
            .trigger('click');
    },
    update: function(e, overlay) {
        var $target = $(e.target);
        overlay.data('editing', true)
          .on('mousemove.Line', function(e) {
            $target.attr({x2: e.pageX, y2: e.pageY});
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
        var obj = $('<textarea>').css({left: e.pageX, top: e.pageY});
        obj.data('plugin', 'Text')
            .appendTo(overlay.next())
            .on('keyup', function(e) {
                if (e.keyCode == 27) {
                    obj.remove();
                }
            });
    }
};


})(window);
