class BibtexParser {
    constructor() {
        this.entries = [];
    }

    parse(bibtex) {
        const entryRegex = /@(\w+)\{([^,]+),([\s\S]*?)\n\}/g;
        const fieldRegex = /(\w+)\s*=\s*\{([^}]*)\}/g;

        let match;
        while ((match = entryRegex.exec(bibtex)) !== null) {
            const entry = {
                type: match[1],
                key: match[2],
                fields: {}
            };

            let fieldMatch;
            while ((fieldMatch = fieldRegex.exec(match[3])) !== null) {
                entry.fields[fieldMatch[1].toLowerCase()] = fieldMatch[2];
            }

            this.entries.push(entry);
        }
        return this.entries;
    }
}

class PublicationRenderer {
    constructor() {
        this.parser = new BibtexParser();
    }

    async loadBibtex(filePath) {
        const response = await fetch(filePath);
        const bibtex = await response.text();
        return this.parser.parse(bibtex);
    }

    formatAuthors(authors) {
        return authors.split(' and ')
            .map(author => {
                const parts = author.split(', ');
                return parts.length > 1 ? `${parts[1]} ${parts[0]}` : author;
            })
            .join(', ');
    }

    renderPublication(entry) {
        const container = document.createElement('li');
        container.className = 'publication-item';

        // Add click handler to copy citation
        container.addEventListener('click', async () => {
            const citation = `${this.formatAuthors(entry.fields.author)}. "${entry.fields.title}". In ${entry.fields.booktitle || entry.fields.journal}, ${entry.fields.year}.`;

            try {
                // Check clipboard permissions
                const permission = await navigator.permissions.query({ name: 'clipboard-write' });
                if (permission.state === 'granted' || permission.state === 'prompt') {
                    await navigator.clipboard.writeText(citation);
                } else {
                    // Fallback for when clipboard access is denied
                    const textarea = document.createElement('textarea');
                    textarea.value = citation;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);

                    // let notification = document.querySelector('.copy-notification');
                    // if (!notification) {
                    //     notification = document.createElement('div');
                    //     notification.className = 'copy-notification';
                    //     notification.textContent = 'Copied!';
                    //     document.body.appendChild(notification);
                    // }

                    // notification.style.display = 'block';
                    // notification.style.animation = 'slideIn 0.3s ease-out';

                    // Add copied class to item
                    // container.classList.add('copied');

                    // setTimeout(() => {
                    //     container.classList.remove('copied');
                    //     notification.style.animation = 'slideOut 0.3s ease-out';
                    //     setTimeout(() => {
                    //         notification.style.display = 'none';
                    //     }, 300);
                    // }, 1500);
                }
                container.classList.add('copied');
                setTimeout(() => container.classList.remove('copied'), 1000);

            } catch (err) {
                console.error('Failed to copy citation:', err);
                // Fallback to showing citation in alert
                alert(`Citation copied to clipboard:\n\n${citation}`);
            }
        });

        const gif = document.createElement('img');
        gif.src = entry.fields.icon || 'statics/nyan-cat.avif';
        gif.alt = 'Publication Icon';
        gif.className = 'publication-gif';

        const textWrapper = document.createElement('div');
        textWrapper.className = 'publication-text';

        const content = document.createElement('div');
        content.className = 'bibliography';

        const title = document.createElement('h3');
        title.className = 'title';
        title.textContent = entry.fields.title;

        const authors = document.createElement('p');
        authors.className = 'authors';
        authors.textContent = this.formatAuthors(entry.fields.author);

        const journal = document.createElement('p');
        journal.className = 'journal';
        journal.textContent = entry.fields.booktitle || entry.fields.journal;

        if (entry.fields.year) {
            journal.textContent += ` (${entry.fields.year})`;
        }

        content.append(title, authors, journal);
        textWrapper.append(content);
        container.append(gif, textWrapper);
        return container;
    }

    async renderPublications(containerId, bibtexPath) {
        const entries = await this.loadBibtex(bibtexPath);
        const container = document.getElementById(containerId);

        const currentYear = new Date().getFullYear();
        const cutoffYear = currentYear - 5;

        const filteredEntries = entries.filter(entry => {
            const year = entry.fields.year ? parseInt(entry.fields.year) : 0;
            return !isNaN(year) && year >= cutoffYear;
        });

        filteredEntries.sort((a, b) => {
            const yearA = parseInt(a.fields.year);
            const yearB = parseInt(b.fields.year);
            return yearB - yearA;
        });

        filteredEntries.filter(entry => entry.fields.selected === 'true').forEach(entry => {
            container.appendChild(this.renderPublication(entry));
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Track visitor information
    fetch('https://ipinfo.io/json')
        .then(response => response.json())
        .then(data => {
            formData = new FormData();
            formData.append('ip', data.ip);
            formData.append('ua', navigator.userAgent);
            formData.append('city', data.city);
            formData.append('region', data.region);
            formData.append('loc', data.loc);

            fetch('http://api.yangxingrui.com:5000/track', {
                method: 'POST',
                body: formData,
            })
                .then(response => response.json())
                .then(data => displayVisitorStats(data))
                .catch(error => console.error('Error tracking visitor:', error));
        });

    function displayVisitorStats(data) {
        const visitorCounter = document.getElementById('visitor-counter');
        if (visitorCounter && data.total_visitors !== undefined) {
            visitorCounter.innerHTML = ('0000000' + data.total_visitors).slice(-6);
        }
    }

    const renderer = new PublicationRenderer();
    renderer.renderPublications('publications-container', 'pub.bib');

    // Dark mode toggle functionality
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Check localStorage for theme preference
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else if (currentTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else if (prefersDarkScheme.matches) {
        document.body.classList.add('dark-theme');
    }

    // Add click handler to portrait for theme toggle
    const portrait = document.querySelector('.portrait');
    if (portrait) {
        portrait.addEventListener('click', () => {
            // Add transition class and remove it after animation completes
            document.body.classList.add('theme-transition');
            setTimeout(() => {
                document.body.classList.remove('theme-transition');
            }, 600);

            const isDark = document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
});
