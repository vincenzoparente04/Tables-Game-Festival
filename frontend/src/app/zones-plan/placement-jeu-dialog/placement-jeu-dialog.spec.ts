import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlacementJeuDialog } from './placement-jeu-dialog';

describe('PlacementJeuDialog', () => {
  let component: PlacementJeuDialog;
  let fixture: ComponentFixture<PlacementJeuDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlacementJeuDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlacementJeuDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
