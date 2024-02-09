const {
    EditorSuggest,
    Plugin,
    PluginSettingTab,
    Setting
} = require('obsidian')

const DEFAULT_SETTINGS = {
    mentionTypes: [],

    // matchStart: undefined,
}

const getLink = (path, settings) => {
    if (!path.endsWith('.md')) {
        return null;
    }

    for (let i = 0; i < settings.mentionTypes.length; i++) {
        const type = settings.mentionTypes[i];

        if (!type?.sign) {
            continue;
        }

        if (!path.includes('/' + type.sign)) {
            continue;
        }

        const regex = new RegExp(`/${type.sign}([^/]+)\\.md$`);
        let result = regex.exec(path)

        if (result?.[1]) {
            return {
                sign: type.sign,
                name: result[1],
                path
            }
        }
    }

    return null;
}

function getTypeDef(types, sign) {
    for (let i = 0; i < types.length; i++) {
        if (sign === types[i]?.sign) {
            return types[i];
        }
    }

    return null;
}

module.exports = class AtPeople extends Plugin {
    async onload() {
        await this.loadSettings()

        this.registerEvent(this.app.vault.on('delete', async event => {
            await this.update(event)
        }))
        this.registerEvent(this.app.vault.on('create', async event => {
            await this.update(event)
        }))
        this.registerEvent(this.app.vault.on('rename', async (event, originalFilepath) => {
            await this.update(event, originalFilepath)
        }))

        this.addSettingTab(new AtPeopleSettingTab(this.app, this))
        this.suggestor = new AtPeopleSuggestor(this.app, this.settings)
        this.registerEditorSuggest(this.suggestor)
        this.app.workspace.onLayoutReady(this.initialize)
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        )
    }

    async saveSettings() {
        await this.saveData(this.settings || DEFAULT_SETTINGS)
    }

    refreshFileList = () => {
        this.suggestor.setSuggestionsMap(this.fileMaps)
    }

    update = async ({path, deleted, ...remaining}, originalFilepath) => {
        let needsUpdated = false;

        this.fileMaps = this.fileMaps || {}

        const addItem = getLink(path, this.settings)

        if (addItem) {
            this.addFileToMap(addItem)
            needsUpdated = true
        }

        const removeItem = originalFilepath && getLink(originalFilepath, this.settings)
        if (removeItem) {
            this.removeFileFromMap(removeItem)
            needsUpdated = true
        }

        if (needsUpdated) {
            this.refreshFileList()
        }
    }

    initialize = () => {
        this.fileMaps = {}

        for (const filename in this.app.vault.fileMap) {
            const addItem = getLink(filename, this.settings)

            if (addItem) {
                this.addFileToMap(addItem)
            }
        }

        window.setTimeout(this.refreshFileList, 0, this)
    }

    addFileToMap(item) {
        const sign = item?.sign;
        
        if (!sign) {
            return;
        }

        const key = item.name.toLowerCase();
        this.fileMaps[sign] = this.fileMaps[sign] || {};
        this.fileMaps[sign][key] = item;
    }

    removeFileFromMap(item) {
        const sign = item?.sign;

        if (!sign) {
            return;
        }

        if (this.fileMaps[sign]) {
            const key = item.name.toLowerCase();
            delete this.fileMaps[sign][key]
        }
    }
}


class AtPeopleSuggestor extends EditorSuggest {
    constructor(app, settings) {
        super(app)
        this.settings = settings
        this.currSign = '';
    }

    setSuggestionsMap(maps) {
        this.maps = maps;
    }

    onTrigger(cursor, editor, tFile) {
        const usedSigns = this.settings.mentionTypes.map(object => object.sign);

        let charsLeftOfCursor = editor.getLine(cursor.line).substring(0, cursor.ch)

        if (!charsLeftOfCursor) {
            return null;
        }

        let signIndex = -1;

        for (let sign of usedSigns) {
            let index = charsLeftOfCursor.lastIndexOf(sign);

            if (index !== -1 && index > signIndex) {
                signIndex = index;
                this.currSign = sign;
            }
        }

        if (signIndex < 0) {
            return null;
        }

        let query = signIndex >= 0 && charsLeftOfCursor.substring(signIndex + 1)

        if (
            query
            && !query.includes(']]')
            && (
                // if it's an @ at the start of a line
                signIndex === 0
                // or if there's a space character before it
                || charsLeftOfCursor[signIndex - 1] === ' '
            )
        ) {
            return {
                start: {line: cursor.line, ch: signIndex},
                end: {line: cursor.line, ch: cursor.ch},
                query,
            }
        }

        return null
    }

    getSuggestions(context) {
        let suggestions = []
        let map = this.maps[this.currSign] || {};

        for (let key in map) {
            let isMatch;

            if (!key) {
                continue;
            }

            const term = context.query.toLowerCase()

            if (this.settings.matchStart) {
                isMatch = key.startsWith(term)
            } else {
                isMatch = key.includes(term);
            }

            if (isMatch) {
                suggestions.push({
                    suggestionType: 'set',
                    displayText: map[key].name.trim(),
                    linkName: map[key].name,
                    context,
                })
            }
        }

        suggestions.push({
            suggestionType: 'create',
            displayText: context.query,
            linkName: context.query,
            context,
        })

        return suggestions
    }

    renderSuggestion(value, elem) {
        if (value.suggestionType === 'create') {
            const type = getTypeDef(this.settings.mentionTypes, this.currSign);
            const label = type?.label || 'Item';

            elem.setText(`Create ${label}: ${value.displayText}`)
        } else {
            elem.setText(value.displayText)
        }
    }

    selectSuggestion(value) {
        let link

        console.log(value);
        link = `[[${this.currSign}${value.linkName}]]`

        value.context.editor.replaceRange(
            link,
            value.context.start,
            value.context.end,
        )
    }

}


// ----------------------------------------------------------------------------
// Settings

/**
 * @param {string[]} usedSigns
 * @param {string} currentSign
 * @returns {object}
 */
function getAvailableSigns(usedSigns, currentSign) {
    const allowedSigns = [
        '@',
        '%',
        '&',
        '!',
        '?',
        '+',
        ';',
        '.',
        '=',
        '^',
        '§',
        '$',
        '-',
        '_',
        '(',
        '{',
    ];

    const availableSigns = {};

    allowedSigns.forEach(sign => {
        if (currentSign === sign || !usedSigns.includes(sign)) {
            availableSigns[sign] = `${sign}Name`
        }
    })

    return availableSigns;
}

class AtPeopleSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin)
        this.plugin = plugin
    }


    display() {
        const {containerEl} = this
        let usedSigns = this.plugin.settings.mentionTypes.map(object => object.sign);

        containerEl.empty()

        containerEl.createEl("h2", {text: "Mention Things"});

        this.plugin.settings.mentionTypes.forEach((value, index) => {
            const setting = new Setting(containerEl)
            const availableSigns = getAvailableSigns(usedSigns, value?.sign);

            setting.addDropdown(
                list => list
                    .addOptions(availableSigns)
                    .setValue(value?.sign || '')
                    .onChange(async (value) => {
                        this.plugin.settings.mentionTypes[index].sign = value
                        await this.plugin.saveSettings()
                        this.display()
                    })
            )

            setting.addText(
                text => text
                    .setPlaceholder('Label. Example "Person"')
                    .setValue(value?.label || '')
                    .onChange(async (value) => {
                        this.plugin.settings.mentionTypes[index].label = value
                        await this.plugin.saveSettings()
                    })
                    .inputEl.addClass('type_label')
            )

            setting.addExtraButton(
                button => button
                    .setIcon("cross")
                    .setTooltip("Delete")
                    .onClick(async () => {
                        this.plugin.settings.mentionTypes.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    })
            );

            setting.infoEl.remove();
        });

        new Setting(containerEl)
            .addButton(cb => {
                cb.setButtonText("New Type")
                    .setCta()
                    .onClick(async () => {
                        this.plugin.settings.mentionTypes.push({});
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        new Setting(containerEl)
            .setName('Match from start')
            .setDesc('Whether to suggest only items that start with the search term. When disabled, any part of the name can match the search term')
            .addToggle(
                toggle => toggle.setValue(this.plugin.settings.matchStart)
                    .onChange(async (value) => {
                        this.plugin.settings.matchStart = value
                        await this.plugin.saveSettings()
                    })
            )
    }
}
