import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Image, Zap, RotateCcw } from "lucide-react";
import { validateImageFile, compressImage } from "@/lib/camera-utils";
import { useToast } from "@/hooks/use-toast";

interface CameraInterfaceProps {
  onImageCapture: (file: File) => void;
  isAnalyzing?: boolean;
}

export function CameraInterface({ onImageCapture, isAnalyzing }: CameraInterfaceProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate the file
    const validationError = validateImageFile(file);
    if (validationError) {
      toast({
        title: "Invalid File",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    try {
      // Compress the image before processing
      const compressedFile = await compressImage(file);
      onImageCapture(compressedFile);
    } catch (error) {
      console.error("Error processing image:", error);
      toast({
        title: "Processing Error",
        description: "Failed to process the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCameraCapture = () => {
    // For now, trigger file input - in a real app, this would use the camera API
    fileInputRef.current?.click();
  };

  const handleGalleryOpen = () => {
    fileInputRef.current?.click();
  };

  const handleRetake = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* Camera Viewfinder */}
        <div className="relative h-96 bg-gray-900 rounded-t-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Camera className="h-16 w-16 mb-4 opacity-50 mx-auto" />
              <p className="text-lg mb-2">Point camera at your food</p>
              <p className="text-sm opacity-75">CalorieSnap will identify and calculate calories</p>
            </div>
          </div>
          
          {/* Camera Controls */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-8">
            <Button
              variant="ghost"
              size="lg"
              className="w-12 h-12 bg-white/20 rounded-full hover:bg-white/30"
              onClick={handleGalleryOpen}
              disabled={isAnalyzing}
              data-testid="button-gallery"
            >
              <Image className="h-5 w-5 text-white" />
            </Button>
            
            <Button
              size="lg"
              className="w-20 h-20 bg-white rounded-full hover:bg-white/90 shadow-lg"
              onClick={handleCameraCapture}
              disabled={isAnalyzing}
              data-testid="button-capture"
            >
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                ) : (
                  <Camera className="h-8 w-8 text-primary-foreground" />
                )}
              </div>
            </Button>
            
            <Button
              variant="ghost"
              size="lg"
              className={`w-12 h-12 rounded-full ${
                flashEnabled 
                  ? 'bg-yellow-500/80 hover:bg-yellow-500' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              onClick={() => setFlashEnabled(!flashEnabled)}
              disabled={isAnalyzing}
              data-testid="button-flash"
            >
              <Zap className={`h-5 w-5 ${flashEnabled ? 'text-white' : 'text-white'}`} />
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-file-upload"
        />
      </CardContent>
    </Card>
  );
}
