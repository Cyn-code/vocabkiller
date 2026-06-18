(function () {
    const DEFAULT_MAX_HISTORY = 50;
    const INPUT_GROUP_DELAY_MS = 700;

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(value, maximum));
    }

    function getSelection(textarea) {
        const valueLength = textarea.value.length;
        const selectionStart = Number.isInteger(textarea.selectionStart)
            ? clamp(textarea.selectionStart, 0, valueLength)
            : valueLength;
        const selectionEnd = Number.isInteger(textarea.selectionEnd)
            ? clamp(textarea.selectionEnd, selectionStart, valueLength)
            : selectionStart;

        return { selectionStart, selectionEnd };
    }

    function createSnapshot(textarea) {
        const selection = getSelection(textarea);
        return {
            value: textarea.value,
            selectionStart: selection.selectionStart,
            selectionEnd: selection.selectionEnd,
            scrollTop: textarea.scrollTop
        };
    }

    function snapshotsMatch(left, right) {
        return Boolean(left && right) &&
            left.value === right.value &&
            left.selectionStart === right.selectionStart &&
            left.selectionEnd === right.selectionEnd &&
            left.scrollTop === right.scrollTop;
    }

    function getInsertedText(previousValue, nextValue) {
        let prefixLength = 0;
        const maximumPrefix = Math.min(previousValue.length, nextValue.length);
        while (
            prefixLength < maximumPrefix &&
            previousValue[prefixLength] === nextValue[prefixLength]
        ) {
            prefixLength += 1;
        }

        let suffixLength = 0;
        const maximumSuffix = Math.min(
            previousValue.length - prefixLength,
            nextValue.length - prefixLength
        );
        while (
            suffixLength < maximumSuffix &&
            previousValue[previousValue.length - 1 - suffixLength] ===
                nextValue[nextValue.length - 1 - suffixLength]
        ) {
            suffixLength += 1;
        }

        return nextValue.slice(prefixLength, nextValue.length - suffixLength);
    }

    function isInsertion(inputType) {
        return String(inputType || '').startsWith('insert');
    }

    function attach(textarea, options = {}) {
        if (!textarea || typeof textarea.addEventListener !== 'function') return null;

        const maxHistory = Number.isInteger(options.maxHistory)
            ? Math.max(1, options.maxHistory)
            : DEFAULT_MAX_HISTORY;
        const editModeButton = options.editModeButton || null;
        const undoButton = options.undoButton || null;
        const statusElement = options.statusElement || null;
        const lockAppendCaretToEnd = Boolean(options.lockAppendCaretToEnd);
        const history = [];

        let editMode = false;
        let pendingBeforeInput = null;
        let groupedSnapshot = null;
        let groupedInputTimer = null;
        let appendCaretLockTimer = null;
        let appendCaretLockFrame = null;
        let restoring = false;
        let suppressNextControlClick = false;
        let lastKnownSnapshot = createSnapshot(textarea);
        let penInteractionActive = false;
        let penInteractionTimer = null;

        const isEnabled = () => {
            if (textarea.disabled || textarea.readOnly) return false;
            return typeof options.isEnabled === 'function' ? options.isEnabled() : true;
        };

        const updateStatus = () => {
            if (!statusElement || !isEnabled()) return;
            const customStatus = typeof options.getStatusText === 'function'
                ? options.getStatusText(editMode)
                : '';
            statusElement.textContent = customStatus || (editMode
                ? 'Edit mode - tap existing text to change it'
                : 'Append mode - new writing goes to the end');
        };

        const updateControls = () => {
            const enabled = isEnabled();
            if (editModeButton) {
                editModeButton.disabled = !enabled;
                editModeButton.classList.toggle('active', enabled && editMode);
                editModeButton.setAttribute('aria-pressed', String(enabled && editMode));
            }
            if (undoButton) {
                const customCanUndo = typeof options.canUndo === 'function'
                    ? options.canUndo(editMode, history.length)
                    : null;
                undoButton.disabled = !enabled || (customCanUndo === null
                    ? history.length === 0
                    : !customCanUndo);
            }
            updateStatus();
        };

        const stopInputGroup = () => {
            if (groupedInputTimer) {
                window.clearTimeout(groupedInputTimer);
                groupedInputTimer = null;
            }
            groupedSnapshot = null;
        };

        const endPenInteraction = () => {
            penInteractionActive = false;
            if (penInteractionTimer) {
                window.clearTimeout(penInteractionTimer);
                penInteractionTimer = null;
            }
            stopInputGroup();
        };

        const schedulePenInteractionEnd = () => {
            if (penInteractionTimer) window.clearTimeout(penInteractionTimer);
            penInteractionTimer = window.setTimeout(endPenInteraction, INPUT_GROUP_DELAY_MS);
        };

        const scheduleInputGroupEnd = () => {
            if (groupedInputTimer) window.clearTimeout(groupedInputTimer);
            groupedInputTimer = window.setTimeout(stopInputGroup, INPUT_GROUP_DELAY_MS);
        };

        const pushHistory = (snapshot, groupNativeInput = false) => {
            if (!snapshot) return;

            if (groupNativeInput && groupedSnapshot) {
                scheduleInputGroupEnd();
                return;
            }

            const lastSnapshot = history[history.length - 1];
            if (!snapshotsMatch(lastSnapshot, snapshot)) {
                history.push(snapshot);
                if (history.length > maxHistory) history.shift();
            }

            if (groupNativeInput) {
                groupedSnapshot = snapshot;
                scheduleInputGroupEnd();
            } else {
                stopInputGroup();
            }
            updateControls();
        };

        const setTextareaState = (value, state = {}) => {
            const nextValue = String(value ?? '');
            textarea.value = nextValue;

            const selectionStart = clamp(
                Number.isInteger(state.selectionStart) ? state.selectionStart : nextValue.length,
                0,
                nextValue.length
            );
            const selectionEnd = clamp(
                Number.isInteger(state.selectionEnd) ? state.selectionEnd : selectionStart,
                selectionStart,
                nextValue.length
            );
            textarea.setSelectionRange(selectionStart, selectionEnd);
            if (Number.isFinite(state.scrollTop)) textarea.scrollTop = state.scrollTop;
            lastKnownSnapshot = createSnapshot(textarea);
        };

        const shouldLockAppendCaretToEnd = () => (
            lockAppendCaretToEnd &&
            isEnabled() &&
            !editMode &&
            !restoring
        );

        const moveAppendCaretToEnd = () => {
            if (!shouldLockAppendCaretToEnd()) return;

            const end = textarea.value.length;
            const selection = getSelection(textarea);
            if (selection.selectionStart !== end || selection.selectionEnd !== end) {
                textarea.setSelectionRange(end, end);
                lastKnownSnapshot = createSnapshot(textarea);
            }
        };

        const scheduleAppendCaretLock = () => {
            if (!shouldLockAppendCaretToEnd()) return;

            if (appendCaretLockFrame) {
                window.cancelAnimationFrame(appendCaretLockFrame);
                appendCaretLockFrame = null;
            }
            if (appendCaretLockTimer) {
                window.clearTimeout(appendCaretLockTimer);
                appendCaretLockTimer = null;
            }

            appendCaretLockFrame = window.requestAnimationFrame(() => {
                appendCaretLockFrame = null;
                appendCaretLockTimer = window.setTimeout(() => {
                    appendCaretLockTimer = null;
                    moveAppendCaretToEnd();
                }, 0);
            });
        };

        const cancelAppendCaretLock = () => {
            if (appendCaretLockFrame) {
                window.cancelAnimationFrame(appendCaretLockFrame);
                appendCaretLockFrame = null;
            }
            if (appendCaretLockTimer) {
                window.clearTimeout(appendCaretLockTimer);
                appendCaretLockTimer = null;
            }
        };

        const notifyChange = (source) => {
            if (typeof options.onChange === 'function') {
                options.onChange(textarea.value, {
                    source,
                    ...getSelection(textarea),
                    scrollTop: textarea.scrollTop
                });
            }
        };

        const applyChange = (value, state = {}) => {
            if (!isEnabled() || restoring) return false;

            const previous = createSnapshot(textarea);
            const nextValue = String(value ?? '');
            const selectionStart = Number.isInteger(state.selectionStart)
                ? state.selectionStart
                : nextValue.length;
            const selectionEnd = Number.isInteger(state.selectionEnd)
                ? state.selectionEnd
                : selectionStart;
            const nextState = {
                selectionStart,
                selectionEnd,
                scrollTop: Number.isFinite(state.scrollTop) ? state.scrollTop : textarea.scrollTop
            };

            if (previous.value === nextValue &&
                previous.selectionStart === selectionStart &&
                previous.selectionEnd === selectionEnd) {
                return false;
            }

            pushHistory(previous, Boolean(state.groupNativeInput));
            setTextareaState(nextValue, nextState);
            notifyChange(state.source || 'external');
            updateControls();
            return true;
        };

        const sync = (value, state = {}) => {
            restoring = true;
            setTextareaState(value, state);
            restoring = false;
            updateControls();
        };

        const setEditMode = (enabled) => {
            editMode = Boolean(enabled);
            if (typeof options.onModeChange === 'function') options.onModeChange(editMode);
            updateControls();
            if (editMode) {
                cancelAppendCaretLock();
            } else {
                scheduleAppendCaretLock();
            }
        };

        const reset = (value = '') => {
            history.length = 0;
            pendingBeforeInput = null;
            stopInputGroup();
            setEditMode(false);
            sync(value, {
                selectionStart: String(value ?? '').length,
                selectionEnd: String(value ?? '').length,
                scrollTop: 0
            });
        };

        const undo = () => {
            if (!isEnabled()) return false;
            if (typeof options.onUndo === 'function' && options.onUndo(editMode)) {
                updateControls();
                textarea.focus({ preventScroll: true });
                return true;
            }
            if (history.length === 0) return false;

            stopInputGroup();
            const snapshot = history.pop();
            restoring = true;
            setTextareaState(snapshot.value, snapshot);
            restoring = false;
            notifyChange('undo');
            updateControls();
            textarea.focus({ preventScroll: true });
            return true;
        };

        const recordExternalSnapshot = () => {
            if (!isEnabled()) return false;
            pushHistory(createSnapshot(textarea), false);
            return true;
        };

        const commitExternalChange = (value, state = {}) => {
            if (!isEnabled()) return false;
            sync(value, state);
            notifyChange(state.source || 'external');
            return true;
        };

        const applyBackspace = () => {
            if (!isEnabled() || !textarea.value) return false;
            moveAppendCaretToEnd();

            const selection = getSelection(textarea);
            const deleteStart = selection.selectionStart === selection.selectionEnd
                ? Math.max(0, selection.selectionStart - 1)
                : selection.selectionStart;
            const nextValue = textarea.value.slice(0, deleteStart) +
                textarea.value.slice(selection.selectionEnd);
            const changed = applyChange(nextValue, {
                selectionStart: deleteStart,
                selectionEnd: deleteStart,
                source: 'backspace'
            });
            textarea.focus({ preventScroll: true });
            scheduleAppendCaretLock();
            return changed;
        };

        const clear = () => {
            if (!isEnabled() || !textarea.value) return false;
            const changed = applyChange('', {
                selectionStart: 0,
                selectionEnd: 0,
                scrollTop: 0,
                source: 'clear'
            });
            textarea.focus({ preventScroll: true });
            scheduleAppendCaretLock();
            return changed;
        };

        const onBeforeInput = (event) => {
            if (!isEnabled() || restoring) return;
            if (event.inputType === 'historyUndo') {
                event.preventDefault();
                undo();
                return;
            }

            const snapshot = createSnapshot(textarea);
            pendingBeforeInput = {
                snapshot,
                inputType: event.inputType || '',
                redirectToEnd: !editMode &&
                    isInsertion(event.inputType) &&
                    (snapshot.selectionStart !== snapshot.value.length ||
                        snapshot.selectionEnd !== snapshot.value.length)
            };

            if (pendingBeforeInput.redirectToEnd && typeof event.data === 'string') {
                event.preventDefault();
                pendingBeforeInput = null;
                applyChange(snapshot.value + event.data, {
                    selectionStart: snapshot.value.length + event.data.length,
                    selectionEnd: snapshot.value.length + event.data.length,
                    source: 'append',
                    groupNativeInput: penInteractionActive
                });
                scheduleAppendCaretLock();
            }
        };

        const onInput = () => {
            if (!isEnabled() || restoring) return;

            const pending = pendingBeforeInput;
            pendingBeforeInput = null;
            if (!pending) {
                const previousSnapshot = lastKnownSnapshot;
                const currentSnapshot = createSnapshot(textarea);
                const insertedText = getInsertedText(previousSnapshot.value, currentSnapshot.value);
                const shouldRedirectNativeInsertion = shouldLockAppendCaretToEnd() &&
                    insertedText &&
                    currentSnapshot.value !== previousSnapshot.value + insertedText &&
                    !currentSnapshot.value.startsWith(previousSnapshot.value);

                if (shouldRedirectNativeInsertion) {
                    pushHistory(previousSnapshot, penInteractionActive);
                    const nextValue = previousSnapshot.value + insertedText;
                    setTextareaState(nextValue, {
                        selectionStart: nextValue.length,
                        selectionEnd: nextValue.length,
                        scrollTop: textarea.scrollTop
                    });
                    notifyChange('append');
                    updateControls();
                    scheduleAppendCaretLock();
                    return;
                }

                pushHistory(lastKnownSnapshot, penInteractionActive);
                notifyChange('native');
                lastKnownSnapshot = createSnapshot(textarea);
                scheduleAppendCaretLock();
                return;
            }

            if (pending.redirectToEnd) {
                const recognizedText = getInsertedText(pending.snapshot.value, textarea.value);
                if (!recognizedText) {
                    sync(pending.snapshot.value, pending.snapshot);
                    if (typeof options.onAttention === 'function') options.onAttention();
                    return;
                }

                pushHistory(pending.snapshot, penInteractionActive);
                const nextValue = pending.snapshot.value + recognizedText;
                setTextareaState(nextValue, {
                    selectionStart: nextValue.length,
                    selectionEnd: nextValue.length,
                    scrollTop: textarea.scrollTop
                });
                notifyChange('append');
                lastKnownSnapshot = createSnapshot(textarea);
                updateControls();
                scheduleAppendCaretLock();
                return;
            }

            pushHistory(pending.snapshot, penInteractionActive);
            notifyChange('native');
            lastKnownSnapshot = createSnapshot(textarea);
            updateControls();
            scheduleAppendCaretLock();
        };

        const onPasteOrDrop = (event) => {
            event.preventDefault();
            if (typeof options.onAttention === 'function') options.onAttention();
        };

        const onPointerDown = (event) => {
            if (event.pointerType !== 'pen' || !isEnabled()) return;
            endPenInteraction();
            penInteractionActive = true;
            scheduleAppendCaretLock();
        };

        const onPointerEnd = (event) => {
            if (event.pointerType !== 'pen' || !penInteractionActive) return;
            schedulePenInteractionEnd();
            scheduleAppendCaretLock();
        };

        const onAppendCaretLockEvent = () => scheduleAppendCaretLock();

        const onSelectionChange = () => {
            if (document.activeElement !== textarea) return;
            scheduleAppendCaretLock();
        };

        const handleControlPointerDown = (event, action) => {
            event.preventDefault();
            suppressNextControlClick = true;
            action();
        };

        const handleControlClick = (event, action) => {
            event.preventDefault();
            if (suppressNextControlClick) {
                suppressNextControlClick = false;
                return;
            }
            action();
        };

        const onEditModePointerDown = (event) => {
            handleControlPointerDown(event, () => {
                if (!isEnabled()) return;
                setEditMode(!editMode);
                textarea.focus({ preventScroll: true });
            });
        };
        const onEditModeClick = (event) => handleControlClick(event, () => {
            if (!isEnabled()) return;
            setEditMode(!editMode);
            textarea.focus({ preventScroll: true });
        });
        const onUndoPointerDown = (event) => handleControlPointerDown(event, undo);
        const onUndoClick = (event) => handleControlClick(event, undo);

        textarea.addEventListener('beforeinput', onBeforeInput);
        textarea.addEventListener('input', onInput);
        textarea.addEventListener('paste', onPasteOrDrop);
        textarea.addEventListener('drop', onPasteOrDrop);
        textarea.addEventListener('focus', onAppendCaretLockEvent);
        textarea.addEventListener('click', onAppendCaretLockEvent);
        textarea.addEventListener('select', onAppendCaretLockEvent);
        textarea.addEventListener('touchend', onAppendCaretLockEvent);
        textarea.addEventListener('pointerdown', onPointerDown);
        textarea.addEventListener('pointerup', onPointerEnd);
        textarea.addEventListener('pointercancel', onPointerEnd);
        document.addEventListener('selectionchange', onSelectionChange);
        editModeButton?.addEventListener('pointerdown', onEditModePointerDown);
        editModeButton?.addEventListener('click', onEditModeClick);
        undoButton?.addEventListener('pointerdown', onUndoPointerDown);
        undoButton?.addEventListener('click', onUndoClick);
        updateControls();
        scheduleAppendCaretLock();

        return {
            sync,
            applyChange,
            applyBackspace,
            clear,
            undo,
            reset,
            setEditMode,
            isEditMode: () => editMode,
            canUndo: () => history.length > 0,
            recordExternalSnapshot,
            commitExternalChange,
            refresh: updateControls,
            destroy() {
                endPenInteraction();
                stopInputGroup();
                cancelAppendCaretLock();
                textarea.removeEventListener('beforeinput', onBeforeInput);
                textarea.removeEventListener('input', onInput);
                textarea.removeEventListener('paste', onPasteOrDrop);
                textarea.removeEventListener('drop', onPasteOrDrop);
                textarea.removeEventListener('focus', onAppendCaretLockEvent);
                textarea.removeEventListener('click', onAppendCaretLockEvent);
                textarea.removeEventListener('select', onAppendCaretLockEvent);
                textarea.removeEventListener('touchend', onAppendCaretLockEvent);
                textarea.removeEventListener('pointerdown', onPointerDown);
                textarea.removeEventListener('pointerup', onPointerEnd);
                textarea.removeEventListener('pointercancel', onPointerEnd);
                document.removeEventListener('selectionchange', onSelectionChange);
                editModeButton?.removeEventListener('pointerdown', onEditModePointerDown);
                editModeButton?.removeEventListener('click', onEditModeClick);
                undoButton?.removeEventListener('pointerdown', onUndoPointerDown);
                undoButton?.removeEventListener('click', onUndoClick);
            }
        };
    }

    window.PencilInputController = { attach };
}());
