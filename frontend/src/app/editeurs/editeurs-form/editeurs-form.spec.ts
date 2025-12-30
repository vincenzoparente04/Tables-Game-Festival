import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditeursForm } from './editeurs-form';

describe('EditeursForm', () => {
  let component: EditeursForm;
  let fixture: ComponentFixture<EditeursForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditeursForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditeursForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
