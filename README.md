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
<script src="https://unpkg.com/@commentwidget/core/dist/comment-widget.umd.js"></script>
<script>
  CommentWidget.init({
    storage: new CommentWidget.LocalStorageAdapter('my-comments')
  });
</script>
```

## Documentation

Visit our [documentation site](./demo/docs.html) for detailed guides and API reference.

## License

MIT

