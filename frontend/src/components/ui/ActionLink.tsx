import { Link, type LinkProps } from 'react-router-dom'
export function ActionLink({ secondary = false, className = '', ...props }: LinkProps & { secondary?: boolean }) {
  return <Link {...props} className={`action-link ${secondary ? 'action-link-secondary' : ''} ${className}`} />
}
