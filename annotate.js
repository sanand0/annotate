/**
Javascript plugin to allow annotations on any page.

- Works on IE9+, Chrome, Firefox, iPad. Zepto / jQuery required
- Click the annotator to start drawing: arrow or text

To use it, add this line to the end of the HTML template:

1. Ensure that bootstrap.css is presnt
2. Add <script class="annogram" src="annotate.js"></script>

The class=annogram should not be changed.

Ensure that boo

DO NOT REMOVE THESE FOLLOWING: THESE ARE NOT COMMENTS, THEY ARE INLINE FILES.
These are extracted and used by the library

>>> style.css
html.annogram .menu {
    position: fixed;
    right: 5px;
    top: 5px;
    z-index: 99999;
}

.gramener-menubox {
    position: fixed;
    width: 36px;
    height: 36px;
    right: 5px;
    top: 5px;
    z-index: 9999;
}

html.annogram svg.overlay {
    position: absolute;
    width: 100%;
    top: 0;
    left: 0;
}

html.drawing rect.menu { fill: url(#MenuPressed); cursor: auto; }
svg.overlay { display: none; }
html.drawing svg.overlay { display: block; cursor: crosshair; background-color: rgba(0,0,0,.1); }
html.drawing svg.overlay * { cursor: auto; }
html.drawing svg.overlay line { stroke: rgba(0,0,0,.8); }
html.drawing svg.overlay .editing, html.drawing svg.overlay line:hover { stroke: red; stroke-width: 2; }
html.drawing svg.overlay textarea { resize: none; background-color: #ffa; border:1px solid #fea; font-family: Georgia, serif; }
<<< style.css

>>> menu.html
<div class="menu">
 <a href="#" class="shape btn btn-danger btn-small">Del</a> 
 <span class="btn-group">
  <a href="#" class="shape text btn btn-primary btn-small">Text</a>
  <a href="#" class="shape rect btn btn-primary btn-small">Rect</a>
  <a href="#" class="shape line btn btn-primary btn-small">Line</a>
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
    });

    $('a.shape', menu).on('click', function(e) {
        e.preventDefault();
        $('a.shape', menu).removeClass('active');
        $(this).addClass('active');
    });


    // Create the overlay. This is the parent of all the SVG elements we'll draw.
    var overlay = $$('svg').attr('class', 'overlay')
        .css('height', Math.max($(document).height(), 2000))
        .appendTo('body');

    // Class used to draw Arrows
    var Arrow = {
        // On Click, we want to start / stop drawing / editing an arrow
        onEdit: function(e) {
            // If we are NOT already editing an arrow,
            if (!Arrow.editing) {
                var x = e.pageX,
                    y = e.pageY;

                // Create a new arrow if we didn't click on one.
                // Else, use the existing arrow.
                if ($(e.target).is('line')) {
                    Arrow.editingLine = $(e.target);
                } else {
                    Arrow.editingLine = $$('line', {
                        'x1': x,
                        'y1': y,
                        'x2': x,
                        'y2': y
                    });
                    overlay.append(Arrow.editingLine);
                }

                // Make a note that we're editing. `editing` has the
                // node we're editing: 1 for (x1,y1), 2 for (x2,y2).
                // If equidistant, use 2 (helps when we start drawing)
                var line = Arrow.editingLine;
                var dx1 = x - line.attr('x1'),
                    dy1 = y - line.attr('y1'),
                    dx2 = x - line.attr('x2'),
                    dy2 = y - line.attr('y2');
                Arrow.editing = dx1*dx1 + dy1*dy1 < dx2*dx2 + dy2*dy2 ? 1 : 2;

                // Set the class stating that we're editing, and bind events
                line.attr('class', 'editing');
                $('html').on('mousemove', Arrow.onMoveWhenEditing)
                         .on('keyup', Arrow.onKeyWhenEditing);
            } else {
                // To end editing, unbind events, and reset stuff
                $('html').off('mousemove', Arrow.onMoveWhenEditing)
                         .off('keyup', Arrow.onKeyWhenEditing);
                Arrow.editing = 0;
                Arrow.editingLine.removeAttr('class');
            }

            // We don't want this to go to anything behind the line or overlay.
            e.stopPropagation();
        },

        // Just move the appropriate end of the line as we move the mouse.
        onMoveWhenEditing: function(e) {
            var attrs = {};
            attrs['x' + Arrow.editing] = e.pageX;
            attrs['y' + Arrow.editing] = e.pageY;
            $(Arrow.editingLine).attr(attrs);
        },

        onKeyWhenEditing: function(e) {
            // Delete removes the current line
            if (e.keyCode == 46) {
                Arrow.editingLine.trigger('click').remove();
            }
        }
    };

    // Class used to draw Textboxes
    var Text = {
        onEdit: function(e) {
            // If we are NOT already editing a textbox
            if (!Text.editing) {
                var x = e.pageX,
                    y = e.pageY;

                // Create a new textbox if we didn't click on one.
                if (overlay.is(e.target)) {
                    Arrow.editingText = $$('foreignObject', {x:x, y:y, width:200, height:60})
                        .append($('<textarea>').css({width:'200px', height:'60px'}));
                    overlay.append(Arrow.editingText);
                }
            }
        }
    };

    $('a.line', menu).on('click', function(e) {
        overlay.off('click');
        overlay.on('click', Arrow.onEdit);
    });

    $('a.text', menu).on('click', function(e) {
        overlay.off('click');
        overlay.on('click', Text.onEdit);
    });
}

})(window);
