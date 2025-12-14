import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Camera, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PhotoCaptureField } from "@/components/ui/PhotoCaptureField";

export default function Section3Exterieur() {
  const { control, watch, setValue } = useFormContext();
  const rayuresBosses = watch("exterieur.rayuresBosses");

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          État extérieur & Coffre
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Inspectez l'état extérieur du véhicule et du coffre
        </p>
      </div>

      {/* Rayures / Bosses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Rayures / Bosses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="exterieur.rayuresBosses"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Présence de rayures ou bosses</FormLabel>
                </div>
              </FormItem>
            )}
          />
          {rayuresBosses && (
            <PhotoCaptureField
              label="Photos des rayures/bosses"
              description="Prends des photos des rayures et bosses détectées."
              value={watch("exterieur.photosRayuresBosses") || []}
              onChange={(val) => {
                setValue("exterieur.photosRayuresBosses", val as string[], {
                  shouldDirty: true,
                });
              }}
              multiple={true}
            />
          )}
          
          <PhotoCaptureField
            label="Photos extérieures du véhicule"
            description="Avant, arrière, côtés. On doit voir les rayures/bosses."
            value={watch("exterieur.photosGlobales") || []}
            onChange={(val) => {
              setValue("exterieur.photosGlobales", val as string[], {
                shouldDirty: true,
              });
            }}
            multiple={true}
          />
          
          <PhotoCaptureField
            label="Photos des jantes"
            description="Zoome sur chaque jante."
            value={watch("exterieur.photosJantes") || []}
            onChange={(val) => {
              setValue("exterieur.photosJantes", val as string[], {
                shouldDirty: true,
              });
            }}
            multiple={true}
          />
          
          <PhotoCaptureField
            label="Photo du coffre et accessoires fournis"
            description="Prends une photo du coffre ouvert et du contenu."
            value={watch("exterieur.photosCoffre") || []}
            onChange={(val) => {
              setValue("exterieur.photosCoffre", val as string[], {
                shouldDirty: true,
              });
            }}
            multiple={true}
          />
        </CardContent>
      </Card>

      {/* Pare-chocs avant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pare-chocs avant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="exterieur.pareChocsAvant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>État</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'état" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="Abîmé">Abîmé</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <PhotoCaptureField
            label="Photos pare-chocs avant"
            description="Prends des photos du pare-chocs avant."
            value={watch("exterieur.photosPareChocsAvant") || []}
            onChange={(val) => {
              setValue("exterieur.photosPareChocsAvant", val as string[], {
                shouldDirty: true,
              });
            }}
            multiple={true}
          />
        </CardContent>
      </Card>

      {/* Pare-chocs arrière */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pare-chocs arrière</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="exterieur.pareChocsArriere"
            render={({ field }) => (
              <FormItem>
                <FormLabel>État</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'état" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="Abîmé">Abîmé</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <PhotoCaptureField
            label="Photos pare-chocs arrière"
            description="Prends des photos du pare-chocs arrière."
            value={watch("exterieur.photosPareChocsArriere") || []}
            onChange={(val) => {
              setValue("exterieur.photosPareChocsArriere", val as string[], {
                shouldDirty: true,
              });
            }}
            multiple={true}
          />
        </CardContent>
      </Card>

      {/* Phares */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Phares</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="exterieur.phares"
            render={({ field }) => (
              <FormItem>
                <FormLabel>État</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'état" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="Cassé">Cassé</SelectItem>
                    <SelectItem value="Abrîmé">Abrîmé</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <PhotoCaptureField
            label="Photos des phares"
            description="Prends des photos des phares avant et arrière."
            value={watch("exterieur.photosPhares") || []}
            onChange={(val) => {
              setValue("exterieur.photosPhares", val as string[], {
                shouldDirty: true,
              });
            }}
            multiple={true}
          />
        </CardContent>
      </Card>

      {/* Pare-brise */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pare-brise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="exterieur.pareBrise"
            render={({ field }) => (
              <FormItem>
                <FormLabel>État</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'état" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="Fêlé">Fêlé</SelectItem>
                    <SelectItem value="Cassé">Cassé</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <PhotoCaptureField
            label="Photos du pare-brise"
            description="Prends des photos du pare-brise."
            value={watch("exterieur.photosPareBrise") || []}
            onChange={(val) => {
              setValue("exterieur.photosPareBrise", val as string[], {
                shouldDirty: true,
              });
            }}
            multiple={true}
          />
        </CardContent>
      </Card>

      {/* Roues / Pneus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Roues / Pneus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="exterieur.rouesPneus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>État</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'état" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="Usé">Usé</SelectItem>
                    <SelectItem value="Abîmé">Abîmé</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <PhotoCaptureField
            label="Photos des roues et pneus"
            description="Prends des photos des roues et pneus."
            value={watch("exterieur.photosRouesPneus") || []}
            onChange={(val) => {
              setValue("exterieur.photosRouesPneus", val as string[], {
                shouldDirty: true,
              });
            }}
            multiple={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
