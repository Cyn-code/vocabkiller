(function () {
    const MIN_POINTS = 4;
    const MIN_SPAN = 28;
    const MIN_DISTANCE = 45;
    const NATIVE_EDIT_DELAY_MS = 260;
    const WORD_TOLERANCE = 14;

    const copiedStyles = [
        'boxSizing',
        'width',
        'height',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'borderTopWidth',
        'borderRightWidth',
        'borderBottomWidth',
        'borderLeftWidth',
        'fontFamily',
        'fontSize',
        'fontStyle',
        'fontWeight',
        'letterSpacing',
        'lineHeight',
        'textAlign',
        'textTransform',
        'wordSpacing',
        'tabSize'
    ];

    function getPoint(event) {
        return {
            x: event.clientX,
            y: event.clientY,
            t: Date.now()
        };
    }

    function getStrokeBounds(points) {
        return points.reduce((bounds, point) => ({
            left: Math.min(bounds.left, point.x),
            right: Math.max(bounds.right, point.x),
            top: Math.min(bounds.top, point.y),
            bottom: Math.max(bounds.bottom, point.y)
        }), {
            left: Infinity,
            right: -Infinity,
            top: Infinity,
            bottom: -Infinity
        });
    }

    function getPathDistance(points) {
        let distance = 0;
        for (let index = 1; index < points.length; index += 1) {
            distance += Math.hypot(
                points[index].x - points[index - 1].x,
                points[index].y - points[index - 1].y
            );
        }
        return distance;
    }

    function isClosedLoop(points, bounds, pathDistance) {
        const first = points[0];
        const last = points[points.length - 1];
        const span = Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top);
        const endpointDistance = Math.hypot(last.x - first.x, last.y - first.y);

        return span > 0 &&
            endpointDistance < Math.max(18, span * 0.28) &&
            pathDistance > span * 2.1;
    }

    function isScratchStroke(points) {
        if (points.length < MIN_POINTS) return false;

        const bounds = getStrokeBounds(points);
        const spanX = bounds.right - bounds.left;
        const spanY = bounds.bottom - bounds.top;
        const pathDistance = getPathDistance(points);

        return Math.max(spanX, spanY) >= MIN_SPAN &&
            pathDistance >= MIN_DISTANCE &&
            !isClosedLoop(points, bounds, pathDistance);
    }

    function rectsIntersect(rect, bounds, tolerance = 0) {
        return rect.left <= bounds.right + tolerance &&
            rect.right >= bounds.left - tolerance &&
            rect.top <= bounds.bottom + tolerance &&
            rect.bottom >= bounds.top - tolerance;
    }

    function rectCenter(rect) {
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    function scoreWordRect(rect, bounds) {
        if (!rectsIntersect(rect, bounds, WORD_TOLERANCE)) return Infinity;

        const strokeCenter = {
            x: bounds.left + (bounds.right - bounds.left) / 2,
            y: bounds.top + (bounds.bottom - bounds.top) / 2
        };
        const wordCenter = rectCenter(rect);
        const dx = strokeCenter.x - wordCenter.x;
        const dy = strokeCenter.y - wordCenter.y;
        return Math.hypot(dx, dy);
    }

    function buildMirror(textarea) {
        const computed = window.getComputedStyle(textarea);
        const mirror = document.createElement('div');

        copiedStyles.forEach((property) => {
            mirror.style[property] = computed[property];
        });
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.overflowWrap = 'break-word';
        mirror.style.wordBreak = computed.wordBreak || 'normal';
        mirror.style.overflow = 'hidden';
        mirror.style.left = '-10000px';
        mirror.style.top = '0';
        mirror.style.minHeight = computed.height;
        mirror.style.width = `${textarea.offsetWidth}px`;

        return mirror;
    }

    function findWordAtStroke(textarea, points) {
        const value = textarea.value;
        if (!value.trim()) return null;

        const bounds = getStrokeBounds(points);
        const mirror = buildMirror(textarea);
        const wordMatches = Array.from(value.matchAll(/\S+/g));

        let cursor = 0;
        const spans = wordMatches.map((match) => {
            const start = match.index;
            const end = start + match[0].length;

            if (start > cursor) {
                mirror.appendChild(document.createTextNode(value.slice(cursor, start)));
            }

            const span = document.createElement('span');
            span.textContent = match[0];
            span.dataset.start = String(start);
            span.dataset.end = String(end);
            mirror.appendChild(span);
            cursor = end;
            return span;
        });

        if (cursor < value.length) {
            mirror.appendChild(document.createTextNode(value.slice(cursor)));
        }

        document.body.appendChild(mirror);

        const textareaRect = textarea.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();
        const candidates = [];

        spans.forEach((span) => {
            Array.from(span.getClientRects()).forEach((rect) => {
                const translatedRect = {
                    left: textareaRect.left + (rect.left - mirrorRect.left) - textarea.scrollLeft,
                    right: textareaRect.left + (rect.right - mirrorRect.left) - textarea.scrollLeft,
                    top: textareaRect.top + (rect.top - mirrorRect.top) - textarea.scrollTop,
                    bottom: textareaRect.top + (rect.bottom - mirrorRect.top) - textarea.scrollTop,
                    width: rect.width,
                    height: rect.height
                };
                const score = scoreWordRect(translatedRect, bounds);
                if (Number.isFinite(score)) {
                    candidates.push({
                        start: parseInt(span.dataset.start, 10),
                        end: parseInt(span.dataset.end, 10),
                        score
                    });
                }
            });
        });

        mirror.remove();

        if (candidates.length === 0) return null;
        candidates.sort((a, b) => a.score - b.score);
        return candidates[0];
    }

    function expandDeletionRange(value, start, end) {
        let deleteStart = start;
        let deleteEnd = end;

        while (deleteStart > 0 && /\s/.test(value[deleteStart - 1])) {
            deleteStart -= 1;
        }
        while (deleteEnd < value.length && /\s/.test(value[deleteEnd])) {
            deleteEnd += 1;
        }

        return { start: deleteStart, end: deleteEnd };
    }

    function applyDeletion(textarea, range, options) {
        const value = textarea.value;
        if (!range || range.start < 0 || range.end <= range.start) return;

        const expandedRange = expandDeletionRange(value, range.start, range.end);
        const nextValue = value.slice(0, expandedRange.start) + value.slice(expandedRange.end);
        if (typeof options.onBeforeChange === 'function') {
            options.onBeforeChange({
                value,
                selectionStart: textarea.selectionStart,
                selectionEnd: textarea.selectionEnd,
                scrollTop: textarea.scrollTop,
                source: 'scratch-delete'
            });
        }
        textarea.value = nextValue;
        textarea.setSelectionRange(expandedRange.start, expandedRange.start);
        textarea.focus({ preventScroll: true });

        if (typeof options.onChange === 'function') {
            options.onChange(nextValue, {
                selectionStart: expandedRange.start,
                selectionEnd: expandedRange.start,
                scrollTop: textarea.scrollTop,
                source: 'scratch-delete'
            });
        } else {
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function shouldAttach(textarea) {
        return textarea &&
            typeof PointerEvent !== 'undefined' &&
            typeof textarea.addEventListener === 'function';
    }

    function attach(textarea, options = {}) {
        if (!shouldAttach(textarea)) return null;

        let stroke = null;

        const isEnabled = () => {
            if (textarea.disabled || textarea.readOnly) return false;
            return typeof options.isEnabled === 'function' ? options.isEnabled() : true;
        };

        const onPointerDown = (event) => {
            if (event.pointerType !== 'pen' || !isEnabled()) return;

            stroke = {
                pointerId: event.pointerId,
                points: [getPoint(event)],
                startValue: textarea.value
            };
        };

        const onPointerMove = (event) => {
            if (!stroke || event.pointerId !== stroke.pointerId || event.pointerType !== 'pen') return;
            stroke.points.push(getPoint(event));
        };

        const onPointerEnd = (event) => {
            if (!stroke || event.pointerId !== stroke.pointerId) return;

            const finishedStroke = stroke;
            stroke = null;
            if (event.pointerType === 'pen') {
                finishedStroke.points.push(getPoint(event));
            }
            if (!isScratchStroke(finishedStroke.points)) return;

            window.setTimeout(() => {
                if (!isEnabled()) return;
                if (textarea.value !== finishedStroke.startValue) return;

                const selectionStart = textarea.selectionStart;
                const selectionEnd = textarea.selectionEnd;
                const hasNativeSelection = Number.isInteger(selectionStart) &&
                    Number.isInteger(selectionEnd) &&
                    selectionEnd > selectionStart;
                if (hasNativeSelection) return;

                const range = findWordAtStroke(textarea, finishedStroke.points);
                applyDeletion(textarea, range, options);
            }, NATIVE_EDIT_DELAY_MS);
        };

        const onPointerCancel = (event) => {
            if (stroke && event.pointerId === stroke.pointerId) {
                stroke = null;
            }
        };

        textarea.addEventListener('pointerdown', onPointerDown);
        textarea.addEventListener('pointermove', onPointerMove);
        textarea.addEventListener('pointerup', onPointerEnd);
        textarea.addEventListener('pointercancel', onPointerCancel);

        return {
            destroy() {
                textarea.removeEventListener('pointerdown', onPointerDown);
                textarea.removeEventListener('pointermove', onPointerMove);
                textarea.removeEventListener('pointerup', onPointerEnd);
                textarea.removeEventListener('pointercancel', onPointerCancel);
            }
        };
    }

    window.PencilScratchDeleteFallback = { attach };
}());
