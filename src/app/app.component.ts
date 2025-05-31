import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PackingVisualizerComponent } from "./packing-visualizer/packing-visualizer.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PackingVisualizerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'packing-visualizer';
}
