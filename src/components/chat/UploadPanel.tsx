import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, FileText, Globe, Plus, Upload } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { toast } from "sonner";

export const UploadPanel: React.FC = () => {
  const { uploadDocuments, addWebsites, uploadingFiles, processingFiles, currentChat } = useChat();
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      // Check file sizes (limit to 5MB per file)
      const oversizedFiles = newFiles.filter((file) => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast.error("Some files exceed the 5MB limit and were not added");
        const validFiles = newFiles.filter((file) => file.size <= 5 * 1024 * 1024);
        setFiles((prevFiles) => [...prevFiles, ...validFiles]);
        return;
      }

      // Limit to 10 files total
      if (files.length + newFiles.length > 10) {
        toast.warning("Maximum 10 files allowed");
        const remainingSlots = 10 - files.length;
        if (remainingSlots > 0) {
          setFiles((prevFiles) => [...prevFiles, ...newFiles.slice(0, remainingSlots)]);
        }
        return;
      }

      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleAddUrl = () => {
    if (!currentUrl.trim()) return;

    try {
      new URL(currentUrl); // Validate URL

      // Limit to 10 URLs
      if (urls.length >= 10) {
        toast.warning("Maximum 10 URLs allowed");
        return;
      }

      setUrls([...urls, currentUrl]);
      setCurrentUrl("");
    } catch (error) {
      toast.error("Please enter a valid URL");
    }
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!currentChat) {
      toast.error("Please create a new chat first");
      return;
    }

    if (files.length === 0 && urls.length === 0) {
      toast.error("Please add files or URLs to upload");
      return;
    }

    try {
      if (files.length > 0) {
        await uploadDocuments(files);
        setFiles([]);
      }

      if (urls.length > 0) {
        await addWebsites(urls);
        setUrls([]);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  return (
    <Card className="p-4 border-t border-border">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <Label className="text-sm font-medium mb-1 block">Upload Documents (PDF)</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                multiple
                className="flex-1"
                disabled={uploadingFiles || processingFiles || files.length >= 10}
              />
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 bg-muted p-2 rounded text-sm">
                    <FileText size={16} className="text-primary flex-shrink-0" />
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveFile(index)}
                      disabled={uploadingFiles || processingFiles}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-1 block">Add Websites</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="url"
                placeholder="https://example.com"
                value={currentUrl}
                onChange={(e) => setCurrentUrl(e.target.value)}
                className="flex-1"
                disabled={processingFiles || urls.length >= 10}
              />
              <Button
                onClick={handleAddUrl}
                variant="outline"
                size="icon"
                disabled={processingFiles || urls.length >= 10}
              >
                <Plus size={16} />
              </Button>
            </div>

            {urls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {urls.map((url, index) => (
                  <div key={`${url}-${index}`} className="flex items-center gap-2 bg-muted p-2 rounded text-sm">
                    <Globe size={16} className="text-primary flex-shrink-0" />
                    <span className="truncate flex-1">{url}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveUrl(index)}
                      disabled={processingFiles}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={(files.length === 0 && urls.length === 0) || uploadingFiles || processingFiles || !currentChat}
            className="gap-2"
          >
            <Upload size={16} />
            Upload & Process
            {(uploadingFiles || processingFiles) && (
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
