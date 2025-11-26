import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FestivalsForm } from './festivals-form';

describe('FestivalsForm', () => {
  let component: FestivalsForm;
  let fixture: ComponentFixture<FestivalsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FestivalsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FestivalsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
