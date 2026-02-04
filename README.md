# Tweet Bookmark Manager

> **The best free Twitter/X bookmark manager** - Save tweets with full content, organize with custom tags, filter by type, and search instantly. No signup required!

🔗 **Live Demo**: [tweet-bookmark-manager.vercel.app](https://tweet-bookmark-manager.vercel.app/)

![Tweet Bookmark Manager](og-image.png)

## ✨ Features

- 🔖 **Save Full Tweet Content** - Automatically fetches tweet text, author, and metadata
- 🏷️ **Custom Tags** - Organize bookmarks with your own tags
- 🔍 **Full-Text Search** - Instantly find any bookmark
- 📂 **Smart Filters** - Filter by type: Threads, Images, Videos, Links, Text
- 📤 **Export/Import** - Backup and restore your bookmarks as JSON
- 💾 **Offline Storage** - All data stored locally in your browser
- 🎨 **Beautiful UI** - Modern, responsive design with smooth animations
- ⚡ **Fast & Free** - No signup, no subscription, no limits

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/akanthed/tweet-bookmark-manager.git

# Navigate to the directory
cd tweet-bookmark-manager

# Start a local server
npx serve .

# Open http://localhost:3000
```

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/akanthed/tweet-bookmark-manager)

Or deploy manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 📖 How to Use

1. **Add a Bookmark**: Paste any Twitter/X URL (e.g., `https://x.com/user/status/123...`)
2. **Wait for Auto-Fetch**: The app automatically fetches tweet content
3. **Organize**: Add custom tags to categorize your bookmarks
4. **Search & Filter**: Use the search bar and filters to find bookmarks
5. **Export**: Download your collection as a JSON file for backup

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search bar |
| `N` | Add new bookmark |
| `Esc` | Clear search / Close modals |

## 🛠️ Tech Stack

- **HTML5** - Semantic markup with SEO optimization
- **CSS3** - Modern styling with CSS variables and animations
- **JavaScript** - Vanilla JS with no dependencies
- **Twitter oEmbed API** - For fetching tweet content
- **localStorage** - For client-side data persistence

## 📁 Project Structure

```
tweet-bookmark-manager/
├── index.html          # Main application
├── app.js              # Application logic
├── styles.css          # Styling
├── manifest.json       # PWA manifest
├── vercel.json         # Vercel deployment config
├── robots.txt          # SEO robots file
├── llms.txt            # LLM bots information
├── sitemap.xml         # SEO sitemap
├── test-suite.html     # Test runner UI
├── test-runner.js      # Test implementation
└── README.md           # This file
```

## 🧪 Testing

Open `test-suite.html` in your browser to run the automated test suite. All 11 tests should pass:

1. Add Bookmark
2. Search Functionality
3. Tag System
4. Filter by Content Type
5. Delete Bookmark
6. Export/Import
7. LocalStorage Persistence
8. Bulk Delete
9. Sort Functionality
10. Twitter URL Parsing
11. Text Cleanup

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👤 Author

**Akshay Kanthed**

- GitHub: [@akanthed](https://github.com/akanthed)
- Twitter: [@akshaykanthed](https://x.com/akshaykanthed)
- LinkedIn: [akshay-kanthed](https://www.linkedin.com/in/akshay-kanthed/)

---

Made with ❤️ by Akshay Kanthed

⭐ Star this repo if you find it useful!
