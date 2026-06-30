// Drag-and-drop / click-to-browse file input for the spoiler upload.

export function Dropzone(props: { onFile: (f: File) => void }) {
  let zone: HTMLLabelElement | undefined;
  const over = (e: DragEvent) => {
    e.preventDefault();
    zone?.classList.add("drag-over");
  };
  const leave = () => zone?.classList.remove("drag-over");
  const drop = (e: DragEvent) => {
    e.preventDefault();
    zone?.classList.remove("drag-over");
    const f = e.dataTransfer?.files?.[0];
    if (f) props.onFile(f);
  };
  const change = (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) props.onFile(f);
  };
  return (
    <label
      class="dropzone"
      ref={zone}
      onDragEnter={over}
      onDragOver={over}
      onDragLeave={leave}
      onDrop={drop}
    >
      <input type="file" accept=".txt,text/plain" onChange={change} />
      <div class="dz-mark">◇</div>
      <div class="dz-primary">Drop your AP <em>Spoiler.txt</em></div>
      <div class="dz-meta">or click to browse</div>
    </label>
  );
}
