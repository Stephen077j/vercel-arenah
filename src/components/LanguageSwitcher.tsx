import { useLang } from '@/lib/i18n';

const LanguageSwitcher = () => {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      {(['fr', 'en'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${
            lang === l
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {l === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
