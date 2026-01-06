# Comment Widget

A powerful, Contextual commenting system that can be integrated into any website.

## Features

- 💬 Click-to-comment interface
- 🧵 Threaded conversations
- ⌨️ Keyboard shortcuts
- 💾 Multiple storage options (localStorage, API, Firebase, Supabase)
- 🎨 Customizable styling
- 📱 Responsive design
- ⚡ Lightweight and performant

## Installation

### NPM

```bash
npm install @commentwidget/core
```

### CDN

```html
<script src="https://unpkg.com/@commentwidget/core/dist/comment-widget.umd.js"></script>
```

## Quick Start

### NPM Usage

```typescript
import { initCommentWidget, LocalStorageAdapter } from '@commentwidget/core';

initCommentWidget({
  storage: new LocalStorageAdapter('my-app-comments'),
  primaryColor: '#575CE5'
});
```

### CDN Usage

```html
<!-- Load React dependencies (required for UMD build) -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- Load Comment Widget -->
<script src="https://unpkg.com/@commentwidget/core/dist/comment-widget.umd.js"></script>

<script>
  // Option 1: Using CommentWidget namespace (recommended)
  CommentWidget.init({
    storage: new CommentWidget.LocalStorageAdapter('my-comments'),
    primaryColor: '#575CE5'
  });
  
  // Option 2: Direct window access (also works)
  // initCommentWidget({
  //   storage: new LocalStorageAdapter('my-comments'),
  //   primaryColor: '#575CE5'
  // });
</script>
```

## Documentation

Visit our [documentation site](./demo/docs.html) for detailed guides and API reference.

## License

MIT

