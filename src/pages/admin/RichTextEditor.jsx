import React, { useRef, useEffect, useCallback } from 'react';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Quote,
    Link,
    Undo,
    Redo
} from 'lucide-react';

const ToolButton = ({ onClick, children, title }) => (
    <button
        type="button"
        onClick={onClick}
        className="rte-btn"
        title={title}
    >
        {children}
    </button>
);

const RichTextEditor = ({ value, onChange, placeholder }) => {
    const editorRef = useRef(null);
    const isInternalChange = useRef(false);

    // Set initial content only once
    useEffect(() => {
        if (editorRef.current && value && !editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value;
        }
    }, []);

    // Sync external value changes (e.g., when loading saved content)
    useEffect(() => {
        if (editorRef.current && !isInternalChange.current) {
            if (value !== editorRef.current.innerHTML && value) {
                editorRef.current.innerHTML = value;
            }
        }
        isInternalChange.current = false;
    }, [value]);

    const triggerChange = useCallback(() => {
        if (editorRef.current) {
            isInternalChange.current = true;
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const execCommand = useCallback((command, val = null) => {
        document.execCommand(command, false, val);
        editorRef.current?.focus();
        triggerChange();
    }, [triggerChange]);

    const handleInput = useCallback(() => {
        triggerChange();
    }, [triggerChange]);

    const handlePaste = useCallback((e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        triggerChange();
    }, [triggerChange]);

    const insertLink = useCallback(() => {
        const url = prompt('Enter URL:');
        if (url) {
            execCommand('createLink', url);
        }
    }, [execCommand]);



    return (
        <div className="rich-text-editor">
            <div className="rte-toolbar">
                <div className="rte-toolbar-group">
                    <ToolButton onClick={() => execCommand('undo')} title="Undo">
                        <Undo size={16} />
                    </ToolButton>
                    <ToolButton onClick={() => execCommand('redo')} title="Redo">
                        <Redo size={16} />
                    </ToolButton>
                </div>

                <div className="rte-divider" />

                <div className="rte-toolbar-group">
                    <ToolButton onClick={() => execCommand('formatBlock', '<h2>')} title="Heading 1">
                        <Heading1 size={16} />
                    </ToolButton>
                    <ToolButton onClick={() => execCommand('formatBlock', '<h3>')} title="Heading 2">
                        <Heading2 size={16} />
                    </ToolButton>
                </div>

                <div className="rte-divider" />

                <div className="rte-toolbar-group">
                    <ToolButton onClick={() => execCommand('bold')} title="Bold">
                        <Bold size={16} />
                    </ToolButton>
                    <ToolButton onClick={() => execCommand('italic')} title="Italic">
                        <Italic size={16} />
                    </ToolButton>
                    <ToolButton onClick={() => execCommand('underline')} title="Underline">
                        <Underline size={16} />
                    </ToolButton>
                </div>

                <div className="rte-divider" />

                <div className="rte-toolbar-group">
                    <ToolButton onClick={() => execCommand('insertUnorderedList')} title="Bullet List">
                        <List size={16} />
                    </ToolButton>
                    <ToolButton onClick={() => execCommand('insertOrderedList')} title="Numbered List">
                        <ListOrdered size={16} />
                    </ToolButton>
                    <ToolButton onClick={() => execCommand('formatBlock', '<blockquote>')} title="Quote">
                        <Quote size={16} />
                    </ToolButton>
                </div>

                <div className="rte-divider" />

                <div className="rte-toolbar-group">
                    <ToolButton onClick={() => execCommand('justifyLeft')} title="Align Left">
                        <AlignLeft size={16} />
                    </ToolButton>
                    <ToolButton onClick={() => execCommand('justifyCenter')} title="Align Center">
                        <AlignCenter size={16} />
                    </ToolButton>
                    <ToolButton onClick={() => execCommand('justifyRight')} title="Align Right">
                        <AlignRight size={16} />
                    </ToolButton>
                </div>

                <div className="rte-divider" />

                <div className="rte-toolbar-group">
                    <ToolButton onClick={insertLink} title="Insert Link">
                        <Link size={16} />
                    </ToolButton>
                </div>
            </div>

            <div
                ref={editorRef}
                className="rte-content"
                contentEditable
                onInput={handleInput}
                onPaste={handlePaste}
                data-placeholder={placeholder || 'Write your content here...'}
                suppressContentEditableWarning
            />

            <style>{`
                .rich-text-editor {
                    border: 1px solid #27272a;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #18181b;
                }

                .rte-toolbar {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    padding: 8px 12px;
                    background: #09090b;
                    border-bottom: 1px solid #27272a;
                }

                .rte-toolbar-group {
                    display: flex;
                    gap: 2px;
                }

                .rte-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: none;
                    border-radius: 4px;
                    color: #71717a;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .rte-btn:hover {
                    background: #27272a;
                    color: #fafafa;
                }

                .rte-divider {
                    width: 1px;
                    height: 24px;
                    background: #27272a;
                    margin: 4px 8px;
                }

                .rte-content {
                    min-height: 200px;
                    max-height: 500px;
                    overflow-y: auto;
                    padding: 16px;
                    color: #fafafa;
                    font-size: 14px;
                    line-height: 1.7;
                    outline: none;
                }

                .rte-content:empty:before {
                    content: attr(data-placeholder);
                    color: #52525b;
                }

                .rte-content h2 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 16px 0 8px 0;
                }

                .rte-content h3 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 12px 0 8px 0;
                }

                .rte-content p {
                    margin: 8px 0;
                }

                .rte-content ul,
                .rte-content ol {
                    margin: 8px 0;
                    padding-left: 24px;
                }

                .rte-content li {
                    margin: 4px 0;
                }

                .rte-content blockquote {
                    margin: 12px 0;
                    padding: 12px 20px;
                    border-left: 4px solid #3b82f6;
                    background: rgba(59, 130, 246, 0.1);
                    font-style: italic;
                }

                .rte-content a {
                    color: #3b82f6;
                    text-decoration: underline;
                }

                .rte-content strong,
                .rte-content b {
                    font-weight: 600;
                }

                .rte-content em,
                .rte-content i {
                    font-style: italic;
                }

                .rte-content u {
                    text-decoration: underline;
                }

                @media (max-width: 768px) {
                    .rte-toolbar {
                        padding: 6px 8px;
                    }

                    .rte-btn {
                        width: 28px;
                        height: 28px;
                    }

                    .rte-divider {
                        display: none;
                    }

                    .rte-content {
                        min-height: 150px;
                        padding: 12px;
                    }
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
