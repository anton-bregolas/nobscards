import { useTranslation } from '../i18n'

interface ReviewButtonsProps {
  visible: boolean
  selected: number | null
  onSelect: (rating: number) => void
}

const RATING_NAME = 'srs-rating'

const buttons = [
  { rating: 0, emoji: '\uD83E\uDEE3', key: 'skip' as const, dataAttr: 'skip' },
  { rating: 1, emoji: '\uD83D\uDE33', key: 'again' as const, dataAttr: 'again' },
  { rating: 2, emoji: '\uD83D\uDE2C', key: 'hard' as const, dataAttr: 'hard' },
  { rating: 3, emoji: '\uD83D\uDE42', key: 'good' as const, dataAttr: 'good' },
  { rating: 4, emoji: '\uD83D\uDE0E', key: 'easy' as const, dataAttr: 'easy' },
] as const

const labelKeys = { skip: 'srs.skip', again: 'srs.again', hard: 'srs.hard', good: 'srs.good', easy: 'srs.easy' } as const
const descKeys = { skip: 'srs.skipDesc', again: 'srs.againDesc', hard: 'srs.hardDesc', good: 'srs.goodDesc', easy: 'srs.easyDesc' } as const

export default function ReviewButtons({ visible, selected, onSelect }: ReviewButtonsProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`srs-container absolute bottom-[2%] left-[5%] right-[5%] flex items-stretch rounded-2xl z-10 ${
        visible ? 'transition-opacity duration-375 ease-in-out delay-275 opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {buttons.map(({ rating, emoji, key, dataAttr }) => {
        const fullLabel = `${t(labelKeys[key])} (${t(descKeys[key])})`
        return (
          <label
            key={rating}
            data-srs={dataAttr}
            title={fullLabel}
            aria-label={fullLabel}
            className="srs-radio flex-1 flex items-center justify-center py-2.5 cursor-pointer transition-colors duration-200"
          >
            <input
              type="radio"
              name={RATING_NAME}
              value={rating}
              checked={selected === rating}
              onChange={() => onSelect(rating)}
              className="sr-only"
            />
            <span className="text-xl leading-none pointer-events-none select-none">{emoji}</span>
          </label>
        )
      })}
    </div>
  )
}
