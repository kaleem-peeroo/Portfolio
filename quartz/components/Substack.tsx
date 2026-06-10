import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

interface Options {
  substackUrl: string
}

export default ((opts?: Options) => {
  const Substack: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    if (!opts?.substackUrl) return null

    return (
      <div class={classNames(displayClass, "substack")}>
        <h3>Subscribe</h3>
        <p class="substack-description">Get my posts in your inbox</p>
        <iframe
          src={`https://${opts.substackUrl}/embed`}
          width="100%"
          height="200"
          frameborder="0"
          scrolling="no"
          style={{
            border: "1px solid var(--lightgray)",
            background: "var(--light)",
            borderRadius: "4px",
          }}
        ></iframe>
      </div>
    )
  }

  Substack.css = `
.substack {
  margin-bottom: 1rem;
}
.substack h3 {
  font-family: var(--headerFont);
  font-size: 0.9rem;
  margin: 0 0 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.substack h3::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='2' y='3' width='20' height='14' rx='2'/%3E%3Cpath d='m22 5-8 6-8-6'/%3E%3C/svg%3E") no-repeat center;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='2' y='3' width='20' height='14' rx='2'/%3E%3Cpath d='m22 5-8 6-8-6'/%3E%3C/svg%3E") no-repeat center;
}
.substack-description {
  font-size: 0.8rem;
  color: var(--darkgray);
  margin: 0.25rem 0 0.5rem;
}
`

  return Substack
}) satisfies QuartzComponentConstructor
