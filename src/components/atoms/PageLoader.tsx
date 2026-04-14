import Spinner from './Spinner';

/** Full-area centered spinner — use for page-level loading (early returns). */
const PageLoader = () => (
  <div className="flex items-center justify-center py-32">
    <Spinner size="lg" className="text-primary-600" />
  </div>
);

export default PageLoader;
