import { useEffect, useRef } from 'react';
import { IconLink, IconImage } from '../components/Icons';

// Non contrôlé après le montage : passer une `key` différente (ex. la langue active)
// pour forcer un remontage quand le contenu source change, sans perdre la position du curseur en cours de frappe.
export default function RichTextEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd, arg) {
    ref.current.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current.innerHTML);
  }

  function insertLink() {
    const url = window.prompt('URL du lien');
    if (url) exec('createLink', url);
  }

  function insertImage() {
    const url = window.prompt("URL de l'image");
    if (url) exec('insertImage', url);
  }

  return (
    <div className="rte">
      <div className="rte__toolbar">
        <button type="button" onClick={() => exec('bold')} title="Gras"><b>B</b></button>
        <button type="button" onClick={() => exec('italic')} title="Italique"><i>I</i></button>
        <button type="button" onClick={() => exec('underline')} title="Souligné"><u>U</u></button>
        <span className="rte__sep" />
        <button type="button" onClick={() => exec('formatBlock', 'H1')} title="Titre 1">H1</button>
        <button type="button" onClick={() => exec('formatBlock', 'H2')} title="Titre 2">H2</button>
        <button type="button" onClick={() => exec('formatBlock', 'P')} title="Paragraphe">P</button>
        <span className="rte__sep" />
        <button type="button" onClick={insertLink} title="Insérer un lien"><IconLink /></button>
        <button type="button" onClick={insertImage} title="Insérer une image"><IconImage /></button>
      </div>
      <div
        ref={ref}
        className="rte__content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => onChange(ref.current.innerHTML)}
      />
    </div>
  );
}
