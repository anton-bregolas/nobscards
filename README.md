
# No BS FSRS: Simple Cards with Spaced Repetition
### No AI Assistant. No Data Mining. Just Learning Words.

**No BS FSRS** is a language flashcards app developed by [Anton Zille](https://github.com/anton-bregolas/). It is free, open source, contains no tracking or ads and does not require you to log in or store any personal information on the cloud. All the data is stored locally and you can save and restore your progress and dictionaries. It also works offline and can be installed as a Progressive Web App (PWA).

The app integrates the FSRS v6 spaced repetition algorithm via [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT License).

The app is distributed under the terms of the GNU General Public License v3.0.

## How User Data is Stored

The app user's progress and current dictionary is stored in the browser's Local Storage. You can save and restore your progress in the Settings section by exporting or importing backup files in the JSON format (Settings -> Save Progress / Restore Progress). You can replace the example dictionary with your own as long as it matches the DB format specified below (Settings -> Change Dictionary).

## How to Make Custom Dictionaries

Custom user dictionaries can be imported into the app in the JSON format. To create a compatible dictionary from a list of words you can follow the guidelines below or provide them as a description to your LLM of choice.

A dictionary is a JSON array of Word objects which opens with a single Metadata object. You will need to choose what dictionary type you require and assign role to each of the languages used. The first object in the JSON array contains the metadata that defines the type of the dictionary and assigns roles for languages found within the collection of word objects.

`type: words | phrases`

Use `words` for flashcard dictionaries where the user is expected to input 1-3 words as an answer and where exact match is required for the word to be counted as solved. Use `phrases` for flashcard dictionaries where the user is expected to input multi-word phrases as an answer and where adjustable percentage match is accepted for answers.

A dictionary with type `phrases` automatically enables Phrasebook Mode setting as it is imported. A dictionary with type `words` unchecks Phrasebook Mode setting by default.

`langFrom: lang` Use this to set the default language the user is expected to translate from.

`langTo: lang` Use this to set the default language the user is expected to translate to.

`langToAlt: lang` **Optional**: Use this to set an alternative language the user is asked to translate to (can be enabled in settings).

`langRef: lang` **Optional**: Use this to set an alternative language the user is asked to translate from / will see as the reference language on the flip side of the card.

The three-letter [`ISO 639-3`](https://en.wikipedia.org/wiki/List_of_ISO_639-3_codes) language codes are recommended for `lang` strings.

Example metadata object:

```
{
  "type": "words",
  "langFrom": "srpCyrl",
  "langTo": "rus",
  "langToAlt": "eng",
  "langRef": "srpLatn"
}
```

Explanation: The user is presented with questions in Serbian Cyrillic which they need to translate into Russian (srp-cyrl -> rus). The questions may optionally be in Serbian Latin (srp-latn). The answers have a reference translation into English (eng). The input / answers might optionally be set to English.

A word object must contain a unique `id`, a key-value pair of the language to translate from and a key-value pair of the language to translate to. Optionally, provide key-value pairs for a reference language to translate from and an alternative language to translate to.

Example word object:

```
{
  "id": 111,
  "srpCyrl": "крити",
  "srpLatn": "kriti",
  "rus": [
    "прятать",
    "скрывать"
  ],
  "eng": [
    "to hide",
    "to conceal"
  ]
}
```