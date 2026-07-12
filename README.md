
# No BS Cards

**No BS Cards** is a simple language flashcards app developed by [Anton Zille](https://github.com/anton-bregolas/). It is free, open source, contains no tracking or ads and does not require you to log in or store any personal information on the cloud.

## User Data

The app user's progress is stored in the browser's Local Storage. You can save and restore your progress in the Settings (export or import backup files in JSON format). You can replace the example dictionary with your own as long as it matches the DB format specified below.

## Dictionaries

Custom user dictionaries can be created and imported in the JSON format (an array of objects). To create a compatible dictionary from a list of words you can provide the following description to your LLM of choice. The user will need to choose what dictionary type they require and assign role to each of the languages found.

The first object in the JSON array contains the metadata that defines the type of the dictionary and assigns roles for languages found within the collection of word objects.

`type: words | phrases`

Use `words` for flashcard dictionaries where the user is expected to input 1-3 words as an answer and where exact match is required for the word to be counted as solved. Use `phrases` for flashcard dictionaries where the user is expected to input multi-word phrases as an answer and where adjustable percentage match is accepted for answers.

A dictionary with type `phrases` automatically enables Phrasebook Mode setting as it is imported.

`langFrom: lang` Use this to set the default language the user is expected to translate from.

`langTo: lang` Use this to set the default language the user is expected to translate to.

`langToAlt: lang` Use this to set an optional alternative language the user is expected to translate to.

`langRef: lang` Use this to set an optional alternative language the user is expected to translate from / will see as the reference language on the flip side of the card.

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