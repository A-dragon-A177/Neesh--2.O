import { useParams, Navigate } from "react-router-dom";
import { parseShareableUrl } from "@/lib/slugify";
import SharedPitchFeed from "./SharedPitchFeed";

const PublicBlog = () => {
  const { slugWithId } = useParams();

  if (!slugWithId) {
    return <Navigate to="/" replace />;
  }

  const parsed = parseShareableUrl(slugWithId);
  if (!parsed) {
    return <Navigate to="/" replace />;
  }

  return <SharedPitchFeed projectId={parsed.id} />;
};

export default PublicBlog;
