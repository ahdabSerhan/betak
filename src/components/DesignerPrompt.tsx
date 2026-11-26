import { useState, type FormEvent } from "react";
import { navigate } from "../hooks/useRoute";
import { useShop } from "../state/ShopContext";
import { PhotoButton } from "./PhotoButton";

// The prompt box that hands a request to the AI agent widget.
export function DesignerPrompt() {
  const { t, openAgent, setRoomPhoto } = useShop();
  const [prompt, setPrompt] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (prompt.trim()) openAgent(prompt.trim());
    setPrompt("");
  };

  // The visitor's own photo becomes the room, and the designer opens on it.
  const designOnPhoto = (photo: string) => {
    setRoomPhoto(photo);
    navigate("designer");
  };

  return (
    <div className="prompt">
      <form className="prompt-bar" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="hero-prompt">{t.promptLabel}</label>
        <span aria-hidden="true">✦</span>
        <input id="hero-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={t.promptPlaceholder} autoComplete="off" />
        <button className="btn gold">{t.promptButton}</button>
      </form>
      <div className="chips">
        <PhotoButton className="chip gold" label={t.photoDesign} onPhoto={designOnPhoto}>📷 {t.photoDesign}</PhotoButton>
        {t.agentSuggestions.map((suggestion) => <button className="chip dark" onClick={() => openAgent(suggestion)} key={suggestion}>{suggestion}</button>)}
      </div>
    </div>
  );
}
