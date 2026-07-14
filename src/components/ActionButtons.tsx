import { forwardRef } from 'react'
import type { Word, StoredWord } from '../types'
import { useTranslation } from '../i18n'

interface ActionButtonsProps {
  word: Word | null
  favorites: StoredWord[]
  learned: StoredWord[]
  onNext: () => void
  onToggleFavorite: () => void
  onToggleLearned: () => void
}

const ActionButtons = forwardRef<HTMLButtonElement, ActionButtonsProps>(function ActionButtons({
  word,
  favorites,
  learned,
  onNext,
  onToggleFavorite,
  onToggleLearned,
}, nextRef) {
  const { t } = useTranslation()
  if (!word) return null

  const isFavorite = favorites.some((f) => f.id === word.id)
  const isLearned = learned.some((l) => l.id === word.id)

  return (
    <nav className="flex items-center justify-center gap-4 action-buttons-nav" aria-label={t('actions.label')}>
      <button
        ref={nextRef}
        title={t('actions.next')}
        aria-label={t('actions.next')}
        onClick={onNext}
        data-ui-add="next"
        className="w-12 h-12 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-xl transition-all duration-200 hover:bg-subhead/40 focus-visible:bg-subhead/40 focus-ring focus-circle"
      >
        <i className="bi bi-arrow-repeat" />
      </button>
      <button
        title={isFavorite ? t('actions.removeFavorite') : t('actions.addFavorite')}
        aria-label={isFavorite ? t('actions.removeFavorite') : t('actions.addFavorite')}
        onClick={onToggleFavorite}
        data-ui-add="favorite"
        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-200 focus-ring focus-circle ${
          isFavorite
            ? 'bg-accent text-bg hover:bg-accent/80 focus-visible:bg-accent/80'
            : 'bg-subhead/20 text-subhead hover:bg-subhead/40'
        }`}
      >
        <i className={`bi ${isFavorite ? 'bi-star-fill' : 'bi-star'}`} />
      </button>
      <button
        title={isLearned ? t('actions.removeLearned') : t('actions.addLearned')}
        aria-label={isLearned ? t('actions.removeLearned') : t('actions.addLearned')}
        onClick={onToggleLearned}
        data-ui-add="learned"
        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-200 focus-ring focus-circle ${
          isLearned
            ? 'bg-accent text-bg hover:bg-accent/80 focus-visible:bg-accent/80'
            : 'bg-subhead/20 text-subhead hover:bg-subhead/40'
        }`}
      >
        <i className={`bi ${isLearned ? 'bi-check-circle-fill' : 'bi-check-lg'}`} />
      </button>
    </nav>
  )
})

export default ActionButtons
